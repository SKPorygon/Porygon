import { KubernetesClient, KubernetesConfig } from "../../clients/KubernetesClient";
import WebSocketManager from "../../websockets/websocketServer";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface HealthIssue {
  type: string; // e.g. "ImagePullBackOff", "CrashLoopBackOff", "Unschedulable"
  message: string;
  podName?: string;
  containerName?: string;
  reason?: string;
  details?: any;
}

export interface SuggestedAction {
  title: string;
  description: string;
  ocCommand?: string;
  docsHint?: string;
}

export interface HealthReport {
  namespace: string;
  serviceName: string;
  severity: "ok" | "warning" | "error";
  summary: string;
  issues: HealthIssue[];
  suggestedActions: SuggestedAction[];
  timestamps: {
    detectedAt: string;
  };
}

interface PodStatus {
  phase?: string;
  conditions?: Array<{
    type?: string;
    status?: string;
    reason?: string;
    message?: string;
  }>;
  containerStatuses?: Array<{
    name?: string;
    state?: {
      waiting?: {
        reason?: string;
        message?: string;
      };
      running?: any;
      terminated?: {
        reason?: string;
        exitCode?: number;
        message?: string;
        finishedAt?: string;
      };
    };
    lastState?: {
      terminated?: {
        reason?: string;
        exitCode?: number;
        message?: string;
      };
    };
    restartCount?: number;
    ready?: boolean;
  }>;
  initContainerStatuses?: Array<{
    name?: string;
    state?: {
      waiting?: {
        reason?: string;
        message?: string;
      };
    };
  }>;
}

interface Pod {
  metadata?: {
    name?: string;
    labels?: Record<string, string>;
  };
  status?: PodStatus;
}

interface PodList {
  items: Pod[];
}

interface Event {
  metadata?: {
    name?: string;
    creationTimestamp?: string;
  };
  involvedObject?: {
    kind?: string;
    name?: string;
  };
  reason?: string;
  message?: string;
  type?: string;
  firstTimestamp?: string;
  lastTimestamp?: string;
  count?: number;
}

interface EventList {
  items: Event[];
}

interface DeploymentSpec {
  spec?: {
    selector?: {
      matchLabels?: Record<string, string>;
    };
    template?: {
      metadata?: {
        labels?: Record<string, string>;
      };
    };
  };
  status?: {
    conditions?: Array<{
      type?: string;
      status?: string;
      reason?: string;
      message?: string;
    }>;
    unavailableReplicas?: number;
    replicas?: number;
    readyReplicas?: number;
    updatedReplicas?: number;
    availableReplicas?: number;
    observedGeneration?: number;
  };
  metadata?: {
    name?: string;
    generation?: number;
  };
}

/**
 * Post-Sync Health Guard: Verifies deployment health after sync and detects common failure modes
 */
export class PostSyncHealthGuard extends KubernetesClient {
  constructor(
    config: KubernetesConfig,
    private websocketManager: WebSocketManager
  ) {
    super(config);
  }

  /**
   * Perform health check after sync completion
   */
  async checkHealth(
    namespace: string,
    serviceName: string,
    desiredReplicas: number,
    options: {
      pollIntervalMs?: number;
      timeoutMs?: number;
    } = {}
  ): Promise<HealthReport> {
    const pollIntervalMs = options.pollIntervalMs ?? 2000;
    const timeoutMs = options.timeoutMs ?? 300_000; // 5 minutes default

    const start = Date.now();

    this.websocketManager.broadcast("SYNC_STEP", {
      namespace,
      serviceName,
      step: "POST_SYNC_HEALTH_CHECK",
      message: "Starting post-sync health verification...",
    });

    // Wait for rollout completion (but don't fail if it takes time)
    const rolloutStart = Date.now();
    const rolloutTimeoutMs = Math.min(timeoutMs, 120_000); // Max 2 minutes for rollout wait
    
    let rolloutComplete = false;
    while (Date.now() - rolloutStart < rolloutTimeoutMs && !rolloutComplete) {
      try {
        const deployment = await this.request<DeploymentSpec>(
          `/apis/apps/v1/namespaces/${namespace}/deployments/${serviceName}`,
          { method: "GET" }
        );
        
        const st = deployment?.status ?? {};
        const updated = st.updatedReplicas ?? 0;
        const replicas = st.replicas ?? 0;
        const generation = deployment?.metadata?.generation ?? 0;
        const observedGeneration = deployment?.status?.observedGeneration ?? 0;
        
        // Check conditions - Progressing can be False when complete, Available should be True
        const progressingCondition = deployment?.status?.conditions?.find(
          (c) => c.type === "Progressing"
        );
        const availableOk = deployment?.status?.conditions?.find(
          (c) => c.type === "Available"
        )?.status === "True";
        
        // Rollout is complete when:
        // - Observed generation matches current generation
        // - Updated replicas >= desired
        // - Available replicas >= desired (or Available condition is True)
        // - Progressing condition is either True (still progressing) or False with reason "NewReplicaSetAvailable" (complete)
        rolloutComplete =
          observedGeneration >= generation &&
          updated >= desiredReplicas &&
          replicas >= desiredReplicas &&
          (availableOk || (st.availableReplicas ?? 0) >= desiredReplicas);
        
        if (rolloutComplete) {
          // Give it a moment to stabilize
          await sleep(2000);
          break;
        }
      } catch (error) {
        // If we can't check rollout status, proceed with health check anyway
        console.warn(`Failed to check rollout status:`, error);
        break;
      }
      
      await sleep(pollIntervalMs);
    }

    // Now perform health check
    while (Date.now() - start < timeoutMs) {
      try {
        const report = await this.inspectHealth(namespace, serviceName, desiredReplicas);
        
        // If healthy or we've detected issues, return
        if (report.severity === "ok" || report.issues.length > 0) {
          return report;
        }

        // If still checking and rollout wasn't complete, wait and retry
        if (!rolloutComplete) {
          await sleep(pollIntervalMs);
          continue;
        }

        // Rollout complete but no issues found - return OK
        return report;
      } catch (error: any) {
        // On error, return a report indicating the health check itself failed
        return this.createErrorReport(
          namespace,
          serviceName,
          `Health check error: ${error?.message ?? String(error)}`
        );
      }
    }

    // Timeout: return a warning report
    return this.createErrorReport(
      namespace,
      serviceName,
      "Health check timeout - deployment may still be stabilizing"
    );
  }

  /**
   * Inspect deployment and pods for health issues
   */
  private async inspectHealth(
    namespace: string,
    serviceName: string,
    desiredReplicas: number
  ): Promise<HealthReport> {
    let issues: HealthIssue[] = [];
    const suggestedActions: SuggestedAction[] = [];

    // 1. Fetch deployment
    let deployment: DeploymentSpec;
    try {
      deployment = await this.request<DeploymentSpec>(
        `/apis/apps/v1/namespaces/${namespace}/deployments/${serviceName}`,
        { method: "GET" }
      );
    } catch (error: any) {
      return this.createErrorReport(
        namespace,
        serviceName,
        `Failed to fetch deployment: ${error?.message ?? String(error)}`
      );
    }

    // 2. Check deployment conditions
    const conditions = deployment.status?.conditions ?? [];
    const progressingCondition = conditions.find((c) => c.type === "Progressing");
    const availableCondition = conditions.find((c) => c.type === "Available");

    if (progressingCondition?.status === "False") {
      issues.push({
        type: "ProgressDeadlineExceeded",
        message: progressingCondition.message || "Deployment progress deadline exceeded",
        reason: progressingCondition.reason,
      });
      suggestedActions.push({
        title: "Check deployment rollout status",
        description: "The deployment failed to progress within the deadline",
        ocCommand: `oc rollout status deploy/${serviceName} -n ${namespace}`,
      });
    }

    if (availableCondition?.status === "False") {
      issues.push({
        type: "DeploymentUnavailable",
        message: availableCondition.message || "Deployment is not available",
        reason: availableCondition.reason,
      });
    }

    const unavailableReplicas = deployment.status?.unavailableReplicas ?? 0;
    const readyReplicas = deployment.status?.readyReplicas ?? 0;
    const updatedReplicas = deployment.status?.updatedReplicas ?? 0;
    const replicas = deployment.status?.replicas ?? 0;

    // Only report insufficient ready replicas if rollout is complete but replicas are still not ready
    // During rollout, it's normal for readyReplicas < desiredReplicas temporarily
    const rolloutComplete = updatedReplicas >= desiredReplicas && replicas >= desiredReplicas;
    
    if (unavailableReplicas > 0 && rolloutComplete) {
      // Only flag unavailable replicas if rollout is complete (not during rollout)
      issues.push({
        type: "UnavailableReplicas",
        message: `${unavailableReplicas} replica(s) are unavailable after rollout completion`,
      });
    }

    if (desiredReplicas > 0 && readyReplicas < desiredReplicas && rolloutComplete) {
      // Only flag insufficient ready replicas if rollout is complete
      issues.push({
        type: "InsufficientReadyReplicas",
        message: `Only ${readyReplicas}/${desiredReplicas} replicas are ready after rollout completion`,
      });
    }

    // 3. Fetch pods using deployment selector
    const selector = this.buildSelector(deployment);
    let pods: Pod[] = [];

    try {
      const podList = await this.request<PodList>(
        `/api/v1/namespaces/${namespace}/pods${selector ? `?labelSelector=${encodeURIComponent(selector)}` : ""}`,
        { method: "GET" }
      );
      pods = podList.items ?? [];
    } catch (error: any) {
      console.warn(`Failed to fetch pods for ${serviceName}:`, error);
      // Continue with deployment-level issues only
    }

    // 4. Inspect each pod
    const podNames: string[] = [];
    for (const pod of pods) {
      const podName = pod.metadata?.name;
      if (!podName) continue;
      podNames.push(podName);

      const podIssues = this.inspectPod(pod, serviceName);
      issues.push(...podIssues);
    }

    // Deduplicate issues (same type + pod + container)
    const seen = new Set<string>();
    const uniqueIssues: HealthIssue[] = [];
    for (const issue of issues) {
      const key = `${issue.type}|${issue.podName || ""}|${issue.containerName || ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueIssues.push(issue);
      }
    }
    issues = uniqueIssues;

    // If we have specific container issues (ImagePullBackOff, etc.), remove generic "UnavailableReplicas"
    const hasSpecificContainerIssues = issues.some(
      (i) => i.type === "ImagePullBackOff" || i.type === "ErrImagePull" || 
             i.type === "CrashLoopBackOff" || i.type === "Unschedulable" ||
             i.type === "CreateContainerConfigError" || i.type === "RunContainerError"
    );
    if (hasSpecificContainerIssues) {
      issues = issues.filter((i) => i.type !== "UnavailableReplicas");
    }

    // 5. Fetch events for problematic pods (limit to last 20)
    if (podNames.length > 0 && issues.length > 0) {
      try {
        const events = await this.fetchPodEvents(namespace, podNames.slice(0, 10)); // Limit to 10 pods
        this.enrichIssuesWithEvents(issues, events);
      } catch (error: any) {
        console.warn(`Failed to fetch events:`, error);
      }
    }

    // 6. Generate suggested actions based on issue types
    const actionMap = this.generateSuggestedActions(issues, namespace, serviceName);
    suggestedActions.push(...actionMap);

    // 7. Determine severity and summary
    const severity = this.determineSeverity(issues);
    const summary = this.generateSummary(issues, serviceName, desiredReplicas, readyReplicas);

    return {
      namespace,
      serviceName,
      severity,
      summary,
      issues,
      suggestedActions,
      timestamps: {
        detectedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Build label selector from deployment spec
   */
  private buildSelector(deployment: DeploymentSpec): string {
    const matchLabels = deployment.spec?.selector?.matchLabels;
    if (!matchLabels) return "";

    return Object.entries(matchLabels)
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
  }

  /**
   * Inspect a single pod for issues
   */
  private inspectPod(pod: Pod, serviceName: string): HealthIssue[] {
    const issues: HealthIssue[] = [];
    const podName = pod.metadata?.name ?? "unknown";
    const status = pod.status ?? {};

    // Check container statuses first to detect real issues
    const containerStatuses = status.containerStatuses ?? [];
    const hasRealContainerIssues = containerStatuses.some((cs) => {
      const waitingReason = cs.state?.waiting?.reason ?? "";
      // ContainerCreating is normal during startup - ignore it
      return waitingReason && 
             waitingReason !== "ContainerCreating" && 
             (waitingReason === "ImagePullBackOff" || 
              waitingReason === "ErrImagePull" ||
              waitingReason === "CreateContainerConfigError" ||
              waitingReason === "RunContainerError" ||
              waitingReason === "ImagePullError");
    });

    // Check pod phase
    const phase = status.phase;
    if (phase === "Pending") {
      // Check if unschedulable
      const unschedulable = status.conditions?.find(
        (c) => c.type === "PodScheduled" && c.status === "False"
      );
      if (unschedulable) {
        issues.push({
          type: "Unschedulable",
          message: unschedulable.message || "Pod cannot be scheduled",
          podName,
          reason: unschedulable.reason,
        });
      } else if (!hasRealContainerIssues) {
        // Only report Pending if there are no real container issues
        // (ContainerCreating is normal, so Pending + ContainerCreating = normal startup)
        // But if it's been Pending for a while with no real issues, it might be stuck
        const hasOnlyContainerCreating = containerStatuses.every((cs) => {
          const waitingReason = cs.state?.waiting?.reason ?? "";
          return !waitingReason || waitingReason === "ContainerCreating";
        });
        if (!hasOnlyContainerCreating) {
          // There's something else going on, report it
          issues.push({
            type: "Pending",
            message: "Pod is stuck in Pending state",
            podName,
          });
        }
        // Otherwise, it's just ContainerCreating (normal startup) - don't report
      }
    } else if (phase === "Failed") {
      issues.push({
        type: "PodFailed",
        message: "Pod has failed",
        podName,
      });
    }

    // Check container statuses
    for (const containerStatus of containerStatuses) {
      const containerName = containerStatus.name ?? "unknown";
      const state = containerStatus.state ?? {};

      // Check waiting state (ImagePullBackOff, ErrImagePull, CreateContainerConfigError, etc.)
      if (state.waiting) {
        const reason = state.waiting.reason ?? "";
        const message = state.waiting.message ?? "";

        // Skip ContainerCreating - it's normal during startup
        if (reason === "ContainerCreating") {
          continue;
        }

        if (reason === "ImagePullBackOff" || reason === "ErrImagePull" || reason === "ImagePullError") {
          issues.push({
            type: "ImagePullBackOff",
            message: message || `Container image pull failed: ${reason}`,
            podName,
            containerName,
            reason,
          });
        } else if (reason === "CreateContainerConfigError") {
          issues.push({
            type: "CreateContainerConfigError",
            message: message || "Failed to create container configuration",
            podName,
            containerName,
            reason,
          });
        } else if (reason === "RunContainerError") {
          issues.push({
            type: "RunContainerError",
            message: message || "Failed to run container",
            podName,
            containerName,
            reason,
          });
        } else if (reason && reason !== "ContainerCreating") {
          // Only report other waiting reasons if they're not ContainerCreating
          issues.push({
            type: "ContainerWaiting",
            message: message || `Container is waiting: ${reason}`,
            podName,
            containerName,
            reason,
          });
        }
      }

      // Exit codes that mean graceful shutdown (not a crash): 0, 143=SIGTERM, 130=SIGINT
      const isGracefulExit = (code: number | undefined) =>
        code === 0 || code === 143 || code === 130;

      // Check terminated state (CrashLoopBackOff detection via restartCount + terminated)
      if (state.terminated) {
        const exitCode = state.terminated.exitCode;
        const restartCount = containerStatus.restartCount ?? 0;
        if (restartCount > 3 && !isGracefulExit(exitCode)) {
          issues.push({
            type: "CrashLoopBackOff",
            message:
              state.terminated.message ||
              `Container crashed (exit code: ${exitCode ?? "?"})`,
            podName,
            containerName,
            reason: state.terminated.reason,
            details: {
              exitCode: state.terminated.exitCode,
              restartCount,
            },
          });
        } else if (exitCode !== 0 && !isGracefulExit(exitCode)) {
          issues.push({
            type: "ContainerCrash",
            message:
              state.terminated.message ||
              `Container exited with code ${exitCode}`,
            podName,
            containerName,
            reason: state.terminated.reason,
            details: {
              exitCode: state.terminated.exitCode,
            },
          });
        }
      }

      // Check lastState for previous crashes (e.g. before restart)
      if (containerStatus.lastState?.terminated) {
        const lastTerminated = containerStatus.lastState.terminated;
        const exitCode = lastTerminated.exitCode;
        if (
          (containerStatus.restartCount ?? 0) > 0 &&
          exitCode !== 0 &&
          !isGracefulExit(exitCode)
        ) {
          issues.push({
            type: "PreviousCrash",
            message: `Container previously crashed: ${lastTerminated.message || lastTerminated.reason || "unknown"}`,
            podName,
            containerName,
            reason: lastTerminated.reason,
            details: {
              exitCode: lastTerminated.exitCode,
            },
          });
        }
      }

      // Check readiness
      if (!containerStatus.ready && phase === "Running") {
        issues.push({
          type: "NotReady",
          message: "Container is not ready",
          podName,
          containerName,
        });
      }
    }

    // Check init containers
    const initContainerStatuses = status.initContainerStatuses ?? [];
    for (const initStatus of initContainerStatuses) {
      if (initStatus.state?.waiting) {
        const reason = initStatus.state.waiting.reason ?? "";
        if (reason) {
          issues.push({
            type: "InitContainerWaiting",
            message: `Init container waiting: ${reason}`,
            podName,
            containerName: initStatus.name,
            reason,
          });
        }
      }
    }

    return issues;
  }

  /**
   * Fetch events for pods
   */
  private async fetchPodEvents(namespace: string, podNames: string[]): Promise<Event[]> {
    const allEvents: Event[] = [];

    for (const podName of podNames.slice(0, 10)) {
      try {
        const eventList = await this.request<EventList>(
          `/api/v1/namespaces/${namespace}/events?fieldSelector=involvedObject.name=${podName}&limit=20`,
          { method: "GET" }
        );
        allEvents.push(...(eventList.items ?? []));
      } catch (error) {
        // Continue if event fetch fails for one pod
        console.warn(`Failed to fetch events for pod ${podName}:`, error);
      }
    }

    // Sort by timestamp (newest first) and limit to 20
    return allEvents
      .sort((a, b) => {
        const aTime = a.lastTimestamp || a.firstTimestamp || "";
        const bTime = b.lastTimestamp || b.firstTimestamp || "";
        return bTime.localeCompare(aTime);
      })
      .slice(0, 20);
  }

  /**
   * Enrich issues with event information
   */
  private enrichIssuesWithEvents(issues: HealthIssue[], events: Event[]): void {
    for (const issue of issues) {
      if (!issue.podName) continue;

      const podEvents = events.filter(
        (e) => e.involvedObject?.name === issue.podName && e.type === "Warning"
      );

      if (podEvents.length > 0) {
        const latestEvent = podEvents[0];
        if (!issue.details) issue.details = {};
        issue.details.events = podEvents.map((e) => ({
          reason: e.reason,
          message: e.message,
          timestamp: e.lastTimestamp || e.firstTimestamp,
        }));
      }
    }
  }

  /**
   * Generate suggested actions based on issue types
   */
  private generateSuggestedActions(
    issues: HealthIssue[],
    namespace: string,
    serviceName: string
  ): SuggestedAction[] {
    const actions: SuggestedAction[] = [];
    const issueTypes = new Set(issues.map((i) => i.type));

    // ImagePullBackOff / ErrImagePull
    if (issueTypes.has("ImagePullBackOff") || issueTypes.has("ErrImagePull")) {
      actions.push({
        title: "Check image pull issues",
        description: "Verify image name, tag, and registry authentication",
        ocCommand: `oc describe pod -l app=${serviceName} -n ${namespace}`,
      });
      actions.push({
        title: "View image pull events",
        description: "Check recent events for image pull errors",
        ocCommand: `oc get events -n ${namespace} --sort-by='.lastTimestamp' | grep -i image`,
      });
      actions.push({
        title: "Verify image stream (OpenShift)",
        description: "If using ImageStream, check if it exists and points to correct image",
        ocCommand: `oc get is -n ${namespace}`,
        docsHint: "https://docs.openshift.com/container-platform/latest/openshift_images/image-streams-manage.html",
      });
      actions.push({
        title: "Check registry pull secret",
        description: "Verify image pull secrets are configured correctly",
        ocCommand: `oc get secret -n ${namespace} | grep pull`,
      });
    }

    // CrashLoopBackOff
    if (issueTypes.has("CrashLoopBackOff") || issueTypes.has("ContainerCrash")) {
      const crashIssue = issues.find((i) => i.type === "CrashLoopBackOff" || i.type === "ContainerCrash");
      const containerName = crashIssue?.containerName || serviceName;
      actions.push({
        title: "View container logs",
        description: "Check logs from the crashed container",
        ocCommand: `oc logs -l app=${serviceName} -c ${containerName} --previous -n ${namespace}`,
      });
      actions.push({
        title: "Describe pod for details",
        description: "Get detailed pod status and events",
        ocCommand: `oc describe pod -l app=${serviceName} -n ${namespace}`,
      });
      actions.push({
        title: "Check environment variables and config",
        description: "Verify ConfigMaps, Secrets, and environment variables",
        ocCommand: `oc describe deploy/${serviceName} -n ${namespace} | grep -A 20 "Environment:"`,
        docsHint: "https://kubernetes.io/docs/concepts/configuration/configmap/",
      });
    }

    // Unschedulable
    if (issueTypes.has("Unschedulable")) {
      actions.push({
        title: "Check pod scheduling constraints",
        description: "Review resource requests, node selectors, tolerations, and affinity rules",
        ocCommand: `oc describe pod -l app=${serviceName} -n ${namespace} | grep -A 10 "Events:"`,
      });
      actions.push({
        title: "Check node resources",
        description: "Verify nodes have available resources",
        ocCommand: `oc describe nodes | grep -A 5 "Allocated resources"`,
      });
    }

    // CreateContainerConfigError / RunContainerError
    if (issueTypes.has("CreateContainerConfigError") || issueTypes.has("RunContainerError")) {
      actions.push({
        title: "Check container configuration",
        description: "Verify ConfigMaps, Secrets, and volume mounts",
        ocCommand: `oc describe pod -l app=${serviceName} -n ${namespace}`,
      });
    }

    // ProgressDeadlineExceeded
    if (issueTypes.has("ProgressDeadlineExceeded")) {
      actions.push({
        title: "Check rollout status",
        description: "View detailed rollout status",
        ocCommand: `oc rollout status deploy/${serviceName} -n ${namespace}`,
      });
    }

    // General: always suggest describe and events
    if (issues.length > 0) {
      actions.push({
        title: "View all events",
        description: "See recent events for this namespace",
        ocCommand: `oc get events -n ${namespace} --sort-by='.lastTimestamp' | tail -20`,
      });
    }

    return actions;
  }

  /**
   * Determine overall severity
   */
  private determineSeverity(issues: HealthIssue[]): "ok" | "warning" | "error" {
    if (issues.length === 0) return "ok";

    const errorTypes = new Set([
      "ImagePullBackOff",
      "ErrImagePull",
      "CrashLoopBackOff",
      "CreateContainerConfigError",
      "RunContainerConfigError",
      "RunContainerError",
      "Unschedulable",
      "PodFailed",
      "ProgressDeadlineExceeded",
    ]);

    const hasError = issues.some((i) => errorTypes.has(i.type));
    if (hasError) return "error";

    return "warning";
  }

  /**
   * Generate summary message
   */
  private generateSummary(
    issues: HealthIssue[],
    serviceName: string,
    desiredReplicas: number,
    readyReplicas: number
  ): string {
    if (issues.length === 0) {
      return `✅ ${serviceName} is healthy: ${readyReplicas}/${desiredReplicas} replicas ready`;
    }

    const errorCount = issues.filter((i) =>
      ["ImagePullBackOff", "CrashLoopBackOff", "Unschedulable", "PodFailed"].includes(i.type)
    ).length;

    if (errorCount > 0) {
      return `❌ ${serviceName} has ${errorCount} critical issue(s) detected after sync`;
    }

    return `⚠️ ${serviceName} has ${issues.length} issue(s) detected after sync`;
  }

  /**
   * Create error report when health check itself fails
   */
  private createErrorReport(
    namespace: string,
    serviceName: string,
    errorMessage: string
  ): HealthReport {
    return {
      namespace,
      serviceName,
      severity: "error",
      summary: `Health check failed for ${serviceName}: ${errorMessage}`,
      issues: [
        {
          type: "HealthCheckError",
          message: errorMessage,
        },
      ],
      suggestedActions: [
        {
          title: "Check deployment manually",
          description: "Verify deployment status and pod health",
          ocCommand: `oc get deploy/${serviceName} -n ${namespace}`,
        },
      ],
      timestamps: {
        detectedAt: new Date().toISOString(),
      },
    };
  }
}
