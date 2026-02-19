import axios from "axios";
import {
  KubernetesClient,
  KubernetesConfig,
} from "../../clients/KubernetesClient";
import { ImageParser } from "../../utils/ImageParser";
import WebSocketManager from "../../websockets/websocketServer";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type RolloutWaitOptions = {
  pollIntervalMs?: number;
  timeoutMs?: number;
};

type PodWaitOptions = {
  pollIntervalMs?: number;
  timeoutMs?: number;
  /**
   * default: "deployment"
   * "namespace" ימתין שאין Terminating pods בכלל בnamespace
   */
  scope?: "deployment" | "namespace";
  /**
   * אם אתה יודע selector מדויק אצלכם, תוכל להעביר אותו ולדלג על candidateSelectors.
   * לדוגמה: "app=my-service" או "app.kubernetes.io/name=my-service"
   */
  labelSelectorOverride?: string;
};

export interface DeploymentInfo {
  name: string;
  version: string;
  podCount: number;
  /** OpenShift/Kubernetes app grouping label (app.kubernetes.io/part-of, app.kubernetes.io/name, or app). Empty if none. */
  appGroup: string;
}

interface Container {
  name: string;
  image: string;
}

interface K8sCondition {
  type?: string;
  status?: string; // "True" | "False" | "Unknown"
  reason?: string;
  message?: string;
  lastUpdateTime?: string;
  lastTransitionTime?: string;
}

interface DeploymentSpec {
  spec: {
    replicas?: number;
    template: {
      spec: {
        containers: Container[];
      };
    };
  };
  status?: {
    replicas?: number;
    readyReplicas?: number;
    availableReplicas?: number;
    updatedReplicas?: number;
    unavailableReplicas?: number;
    observedGeneration?: number;
    conditions?: K8sCondition[];
  };
  metadata: {
    name: string;
    generation?: number;
    labels?: Record<string, string>;
  };
}

interface DeploymentList {
  items: DeploymentSpec[];
}

type Pod = {
  metadata?: {
    name?: string;
    deletionTimestamp?: string;
    labels?: Record<string, string>;
  };
  status?: {
    phase?: string;
  };
};

type PodList = { items: Pod[] };

const isConditionTrue = (deployment: DeploymentSpec, type: string) => {
  const conditions = deployment?.status?.conditions ?? [];
  const c = conditions.find((x) => x?.type === type);
  return c?.status === "True";
};

const describeProgress = (deployment: DeploymentSpec) => {
  const st = deployment?.status ?? {};
  return {
    replicas: st.replicas ?? 0,
    updated: st.updatedReplicas ?? 0,
    ready: st.readyReplicas ?? 0,
    available: st.availableReplicas ?? 0,
    unavailable: st.unavailableReplicas ?? 0,
  };
};

/** Get app group from deployment labels (OpenShift/Kubernetes app grouping) */
function getAppGroupFromDeployment(deployment: DeploymentSpec): string {
  const labels = deployment?.metadata?.labels ?? {};
  const partOf = labels["app.kubernetes.io/part-of"];
  if (partOf) return partOf;
  const appName = labels["app.kubernetes.io/name"];
  if (appName) return appName;
  const app = labels["app"];
  if (app) return app;
  return "";
}

/**
 * Manages Kubernetes Deployments
 */
export class DeploymentService extends KubernetesClient {
  constructor(config: KubernetesConfig) {
    super(config);
  }

  /** Get all deployments in a namespace */
  async list(namespace: string): Promise<DeploymentSpec[]> {
    const response = await this.request<DeploymentList>(
      `/apis/apps/v1/namespaces/${namespace}/deployments`,
      { method: "GET" },
    );
    return response.items;
  }

  /** Get a single deployment by name */
  async get(namespace: string, name: string): Promise<DeploymentSpec> {
    return this.request<DeploymentSpec>(
      `/apis/apps/v1/namespaces/${namespace}/deployments/${name}`,
      { method: "GET" },
    );
  }

  /** Get versions and pod counts for all deployments in a namespace */
  async getVersionsAndPodCounts(
    namespace: string,
  ): Promise<Record<string, DeploymentInfo>> {
    console.log("Fetching deployment versions for namespace:", namespace);

    const deployments = await this.list(namespace);
    const versions: Record<string, DeploymentInfo> = {};

    for (const deployment of deployments) {
      const deploymentName = deployment?.metadata?.name;
      if (!deploymentName) continue;

      const containers = deployment?.spec?.template?.spec?.containers ?? [];
      const image = containers?.[0]?.image || "unknown";

      const version =
        image === "unknown" ? "unknown" : ImageParser.extractTag(image);

      const ready = deployment?.status?.readyReplicas;
      const available = deployment?.status?.availableReplicas;

      const podCount =
        typeof ready === "number"
          ? ready
          : typeof available === "number"
            ? available
            : 0;

      const appGroupRaw = getAppGroupFromDeployment(deployment);
      const appGroup = appGroupRaw || "__standalone__";

      versions[deploymentName] = {
        name: deploymentName,
        version,
        podCount,
        appGroup,
      };
    }

    console.log("Computed deployment versions, pod counts and app groups:", versions);
    return versions;
  }

  /** Update the image of a specific container in a deployment */
  async updateImage(
    namespace: string,
    deploymentName: string,
    containerIndex: number,
    newImage: string,
  ): Promise<void> {
    const url = `/apis/apps/v1/namespaces/${namespace}/deployments/${deploymentName}`;
    const patch = [
      {
        op: "replace",
        path: `/spec/template/spec/containers/${containerIndex}/image`,
        value: newImage,
      },
    ];

    await axios.patch(`${this.config.clusterUrl}${url}`, patch, {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json-patch+json",
      },
    });

    console.log(
      `Updated image for deployment "${deploymentName}" to "${newImage}".`,
    );
  }

  /** Scale a deployment to a specific number of replicas */
  async scale(
    namespace: string,
    deploymentName: string,
    replicas: number,
  ): Promise<void> {
    const url = `/apis/apps/v1/namespaces/${namespace}/deployments/${deploymentName}`;
    const patch = [{ op: "replace", path: "/spec/replicas", value: replicas }];

    await axios.patch(`${this.config.clusterUrl}${url}`, patch, {
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json-patch+json",
      },
    });

    console.log(`Scaled deployment "${deploymentName}" to ${replicas} replicas.`);
  }

  /** Find the index of a container by name in the deployment spec */
  findContainerIndex(containers: Container[], containerName: string): number {
    return containers.findIndex((c) => c.name === containerName);
  }

  /** List pods in namespace, optionally filtered by labelSelector */
  async listPods(namespace: string, labelSelector?: string): Promise<Pod[]> {
    const qs = labelSelector
      ? `?labelSelector=${encodeURIComponent(labelSelector)}`
      : "";
    const res = await this.request<PodList>(
      `/api/v1/namespaces/${namespace}/pods${qs}`,
      { method: "GET" },
    );
    return res.items ?? [];
  }

  /**
   * Wait until there are no terminating pods (deletionTimestamp exists).
   * - scope="deployment": tries to filter pods that belong to the deployment via common label selectors,
   *   otherwise falls back to scanning the whole namespace (safer, but broader).
   * - scope="namespace": scans the whole namespace only.
   */
  async waitForNoTerminatingPods(
    namespace: string,
    deploymentName: string,
    websocketManager: WebSocketManager,
    opts: PodWaitOptions = {},
  ): Promise<void> {
    const pollIntervalMs = opts.pollIntervalMs ?? 2000;
    const timeoutMs = opts.timeoutMs ?? 60_000;
    const scope = opts.scope ?? "deployment";

    const start = Date.now();

    const candidateSelectors = opts.labelSelectorOverride
      ? [opts.labelSelectorOverride]
      : [
          // נפוצים
          `app=${deploymentName}`,
          `app.kubernetes.io/name=${deploymentName}`,
          // לפעמים משתמשים בזה
          `name=${deploymentName}`,
        ];

    websocketManager.broadcast("SYNC_STEP", {
      namespace,
      serviceName: deploymentName,
      step: "WAITING_FOR_NO_TERMINATING_PODS",
      scope,
      pollIntervalMs,
      timeoutMs,
    });

    while (true) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(
          `Terminating pods guard timeout for "${deploymentName}" after ${Math.round(timeoutMs / 1000)}s`,
        );
      }

      let pods: Pod[] = [];

      if (scope === "namespace") {
        pods = await this.listPods(namespace);
      } else {
        // scope === "deployment"
        // נסה קודם selectors; אם לא מצאת בכלל pods, fall back לכל הניימספייס (שלא תתקע על selector לא נכון)
        for (const sel of candidateSelectors) {
          const found = await this.listPods(namespace, sel);
          if (found.length > 0) {
            pods = found;
            break;
          }
        }
        if (pods.length === 0) {
          pods = await this.listPods(namespace);
        }
      }

      const terminating = pods.filter((p) => Boolean(p?.metadata?.deletionTimestamp));
      const terminatingNames = terminating
        .map((p) => p?.metadata?.name)
        .filter(Boolean) as string[];

      websocketManager.broadcast("SYNC_STEP", {
        namespace,
        serviceName: deploymentName,
        step: "TERMINATING_PODS_STATUS",
        terminatingCount: terminatingNames.length,
        terminatingPods: terminatingNames.slice(0, 20), // אל תציף
      });

      if (terminatingNames.length === 0) return;

      await sleep(pollIntervalMs);
    }
  }

  /**
   * Wait until a deployment finishes rollout to desired replicas (or timeout).
   */
  async waitForDeploymentRollout(
    namespace: string,
    deploymentName: string,
    desiredReplicas: number,
    websocketManager: WebSocketManager,
    opts: RolloutWaitOptions = {},
  ): Promise<void> {
    const pollIntervalMs = opts.pollIntervalMs ?? 2000;
    const timeoutMs = opts.timeoutMs ?? 60_000;

    const start = Date.now();

    websocketManager.broadcast("SYNC_STEP", {
      namespace,
      serviceName: deploymentName,
      step: "WAITING_FOR_ROLLOUT",
      desiredReplicas,
      pollIntervalMs,
      timeoutMs,
    });

    while (true) {
      if (Date.now() - start > timeoutMs) {
        throw new Error(
          `Rollout timeout for "${deploymentName}" after ${Math.round(timeoutMs / 1000)}s`,
        );
      }

      const deployment = await this.get(namespace, deploymentName);

      const generation = deployment?.metadata?.generation ?? 0;
      const observedGeneration = deployment?.status?.observedGeneration ?? 0;

      const st = deployment?.status ?? {};
      const updated = st.updatedReplicas ?? 0;
      const available = st.availableReplicas ?? 0;

      const progressingOk = isConditionTrue(deployment, "Progressing");
      const availableOk = isConditionTrue(deployment, "Available");

      websocketManager.broadcast("SYNC_STEP", {
        namespace,
        serviceName: deploymentName,
        step: "ROLLOUT_PROGRESS",
        generation,
        observedGeneration,
        progressingOk,
        availableOk,
        ...describeProgress(deployment),
        desiredReplicas,
      });

      const done =
        observedGeneration >= generation &&
        updated >= desiredReplicas &&
        available >= desiredReplicas &&
        availableOk;

      if (done) return;

      await sleep(pollIntervalMs);
    }
  }
}
