import { Request, Response } from "express";
import { OpenShiftService } from "../services/openshiftService";
import WebSocketManager from "../websockets/websocketServer";
import { DeploymentService } from "../services/openshift/DeploymentService";
import { KubernetesConfig } from "../clients/KubernetesClient";
import { PostSyncHealthGuard } from "../services/openshift/PostSyncHealthGuard";
import SyncLog from "../models/SyncLog";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory batch cancel: client can request cancel and the running batch loop will stop
let currentBatchId: string | null = null;
let cancelRequestedForBatchId: string | null = null;
let batchPausedForDecision: string | null = null; // batchId that is paused waiting for user decision
let batchResumed: string | null = null; // batchId that user chose to continue
let hadResumeThisBatch = false; // user clicked Continue this batch → always send a summary at end even if re-check passed

export const fetchNamespaceDeployments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const { namespace, userToken, clusterUrl } = req.body;

  if (!namespace || !userToken || !clusterUrl) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  try {
    const response = await fetch(
      `${clusterUrl}/apis/apps/v1/namespaces/${namespace}/deployments`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const t = await response.text();
      throw new Error(
        `Failed to fetch deployments: ${response.status} ${response.statusText} - ${t}`,
      );
    }

    const data = await response.json();
    const deploymentNames = (data.items || [])
      .map((d: any) => d.metadata?.name)
      .filter(Boolean);

    res.json({ deploymentNames });
  } catch (error) {
    console.error("Error fetching deployments:", error);
    res.status(500).json({ error: "Failed to fetch deployments" });
  }
};

/** Remove control chars and trim so token is safe for Authorization header */
function sanitizeToken(token: unknown): string {
  if (token == null || typeof token !== "string") return "";
  return token.replace(/[\r\n\t]/g, "").trim();
}

async function saveSyncLog(params: {
  profileName: string;
  namespace: string;
  type: "single" | "batch";
  batchId?: string;
  userName: string;
  userEmail?: string;
  userId?: string;
  serviceName: string;
  oldVersion?: string;
  newVersion: string;
  oldPodCount?: number;
  newPodCount?: number;
  status: "success" | "failure";
  errorMessage?: string;
}): Promise<void> {
  try {
    await SyncLog.create(params);
  } catch (err) {
    console.error("[SyncLog] save failed:", err);
  }
}

export const handleSyncService = async (
  req: Request,
  res: Response,
  websocketManager: WebSocketManager,
): Promise<void> => {
  const {
    namespace,
    serviceName,
    desiredVersion,
    desiredPodCount,
    saToken: rawSaToken,
    clusterUrl,
    profileName,
    oldVersion,
    oldPodCount,
    user,
  } = req.body;
  const userName = user?.name ?? "Unknown";
  const userEmail = user?.email;
  const userId = user?.id;

  const saToken = sanitizeToken(rawSaToken);

  // [SYNC_DEBUG] temporary - remove after debugging
  console.log("[SYNC_DEBUG] handleSyncService received:", {
    namespace,
    serviceName,
    desiredVersion,
    desiredPodCount,
    hasSaToken: !!saToken,
    hasClusterUrl: !!clusterUrl,
    clusterUrl: clusterUrl ? `${String(clusterUrl).slice(0, 40)}...` : undefined,
  });

  if (
    !namespace ||
    !serviceName ||
    !desiredVersion ||
    desiredPodCount == null ||
    !saToken ||
    !clusterUrl
  ) {
    console.log("[SYNC_DEBUG] handleSyncService rejected: missing required fields");
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    console.log("[SYNC_DEBUG] handleSyncService calling OpenShiftService.syncService");
    await OpenShiftService.syncService(
      namespace,
      serviceName,
      desiredVersion,
      desiredPodCount,
      saToken,
      clusterUrl,
      websocketManager,
    );

    console.log("[SYNC_DEBUG] handleSyncService completed successfully");
    await saveSyncLog({
      profileName: profileName ?? "",
      namespace,
      type: "single",
      userName,
      userEmail,
      userId,
      serviceName,
      oldVersion,
      newVersion: desiredVersion,
      oldPodCount,
      newPodCount: desiredPodCount,
      status: "success",
    });
    res
      .status(200)
      .json({ message: `Service ${serviceName} synced successfully` });
  } catch (error: any) {
    console.error("[SYNC_DEBUG] handleSyncService error:", error?.message ?? error);
    console.error(`Error syncing service ${serviceName}:`, error);
    await saveSyncLog({
      profileName: profileName ?? "",
      namespace,
      type: "single",
      userName,
      userEmail,
      userId,
      serviceName,
      oldVersion,
      newVersion: desiredVersion,
      oldPodCount,
      newPodCount: desiredPodCount,
      status: "failure",
      errorMessage: error?.message ?? String(error),
    });
    res.status(500).json({ error: error?.message ?? "Failed to sync service" });
  }
};

export const handleMultipleSyncService = async (
  req: Request,
  res: Response,
  websocketManager: WebSocketManager,
): Promise<void> => {
  const { namespace, servicesData, saToken: rawSaToken, clusterUrl, profileName, user } = req.body;
  const saToken = sanitizeToken(rawSaToken);
  const userName = user?.name ?? "Unknown";
  const userEmail = user?.email;
  const userId = user?.id;

  if (!namespace || !Array.isArray(servicesData) || !saToken || !clusterUrl) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const config: KubernetesConfig = { token: saToken, clusterUrl };
  const deploymentService = new DeploymentService(config);

  const batchId = `${namespace}-${Date.now()}`;
  currentBatchId = batchId;
  cancelRequestedForBatchId = null;
  batchPausedForDecision = null;
  batchResumed = null;
  hadResumeThisBatch = false;

  // ✅ response once
  res.status(202).json({
    message: "Smart batch sync started",
    total: servicesData.length,
    batchId,
  });

  websocketManager.broadcast("BATCH_SYNC_STARTED", {
    namespace,
    total: servicesData.length,
    mode: "SMART_ROLLOUT_GUARD",
    batchId,
  });

  let successCount = 0;
  let errorCount = 0;
  const healthReports: Array<{ serviceName: string; report: any }> = [];

  const BETWEEN_SERVICES_DELAY_MS = 500;
  const healthGuard = new PostSyncHealthGuard(config, websocketManager);

  for (const service of servicesData) {
    if (cancelRequestedForBatchId === batchId) {
      websocketManager.broadcast("BATCH_SYNC_CANCELLED", {
        namespace,
        batchId,
        message: "Batch sync was cancelled by user",
      });
      break;
    }

    const serviceName = service?.name;
    const desiredVersion = service?.desiredVersion;
    const desiredPodCount = service?.desiredPodCount;
    const oldVersion = service?.oldVersion;
    const oldPodCount = service?.oldPodCount;

    if (!serviceName || !desiredVersion || desiredPodCount == null) {
      errorCount++;
      await saveSyncLog({
        profileName: profileName ?? "",
        namespace,
        type: "batch",
        batchId,
        userName,
        userEmail,
        userId,
        serviceName: serviceName ?? "unknown",
        oldVersion,
        newVersion: desiredVersion ?? "",
        oldPodCount,
        newPodCount: desiredPodCount ?? 0,
        status: "failure",
        errorMessage: "Invalid service payload (missing name/desiredVersion/desiredPodCount)",
      });
      websocketManager.broadcast("SYNC_COMPLETE", {
        namespace,
        serviceName: serviceName ?? "unknown",
        status: "error",
        error:
          "Invalid service payload (missing name/desiredVersion/desiredPodCount)",
      });
      await sleep(BETWEEN_SERVICES_DELAY_MS);
      continue;
    }

    try {
      // 1) Sync (patch image/replicas)
      await OpenShiftService.syncService(
        namespace,
        serviceName,
        desiredVersion,
        desiredPodCount,
        saToken,
        clusterUrl,
        websocketManager,
      );

      // 2) Wait rollout
      await deploymentService.waitForDeploymentRollout(
        namespace,
        serviceName,
        desiredPodCount,
        websocketManager,
        {
          pollIntervalMs: 2000,
          timeoutMs: 60_000,
        },
      );

      // 3) ✅ Guard: make sure no terminating pods before moving on
      await deploymentService.waitForNoTerminatingPods(
        namespace,
        serviceName,
        websocketManager,
        {
          pollIntervalMs: 2000,
          timeoutMs: 60_000,
          scope: "deployment", // שנה ל-"namespace" אם אתה רוצה guard על כל הניימספייס
          // labelSelectorOverride: `app=${serviceName}`, // אם יש לכם selector חד משמעי
        },
      );

      // 4) Post-sync health check — track failure so we log it correctly
      let healthFailed = false;
      let healthErrorMsg: string | undefined;
      try {
        const healthReport = await healthGuard.checkHealth(
          namespace,
          serviceName,
          desiredPodCount,
          {
            pollIntervalMs: 2000,
            timeoutMs: 300_000, // 5 minutes
          }
        );

        healthReports.push({ serviceName, report: healthReport });

        if (healthReport.severity === "ok") {
          websocketManager.broadcast("POST_SYNC_HEALTH_OK", {
            namespace,
            serviceName,
            report: healthReport,
          });
        } else {
          healthFailed = true;
          healthErrorMsg = healthReport.summary;
          websocketManager.broadcast("POST_SYNC_HEALTH_ALERT", {
            namespace,
            serviceName,
            report: healthReport,
            batchId,
            isFirstAlertInBatch: batchPausedForDecision === null,
          });

          // Pause batch on first health alert to wait for user decision
          if (batchPausedForDecision === null && currentBatchId === batchId) {
            batchPausedForDecision = batchId;
            websocketManager.broadcast("BATCH_SYNC_PAUSED", {
              namespace,
              batchId,
              serviceName,
              message: "Batch sync paused waiting for user decision",
            });

            // Wait for user decision (resume or cancel)
            while (
              batchPausedForDecision === batchId &&
              cancelRequestedForBatchId !== batchId &&
              batchResumed !== batchId
            ) {
              await sleep(500); // Poll every 500ms
            }

            // If cancelled, break out of service loop
            if (cancelRequestedForBatchId === batchId) {
              break;
            }

            // If resumed, continue with next service
            batchPausedForDecision = null;
            batchResumed = null;
          }
        }
      } catch (healthError: any) {
        console.warn(`Health check failed for ${serviceName}:`, healthError);
        healthFailed = true;
        healthErrorMsg = `Health check error: ${healthError?.message ?? String(healthError)}`;
        const errorReport = {
          namespace,
          serviceName,
          severity: "error" as const,
          summary: healthErrorMsg,
          issues: [
            {
              type: "HealthCheckError",
              message: healthError?.message ?? String(healthError),
            },
          ],
          suggestedActions: [],
          timestamps: {
            detectedAt: new Date().toISOString(),
          },
        };
        healthReports.push({ serviceName, report: errorReport });
        websocketManager.broadcast("POST_SYNC_HEALTH_ALERT", {
          namespace,
          serviceName,
          report: errorReport,
          batchId,
          isFirstAlertInBatch: batchPausedForDecision === null,
        });

        // Pause batch on first health alert (even if health check itself failed)
        if (batchPausedForDecision === null && currentBatchId === batchId) {
          batchPausedForDecision = batchId;
          websocketManager.broadcast("BATCH_SYNC_PAUSED", {
            namespace,
            batchId,
            serviceName,
            message: "Batch sync paused waiting for user decision",
          });

          while (
            batchPausedForDecision === batchId &&
            cancelRequestedForBatchId !== batchId &&
            batchResumed !== batchId
          ) {
            await sleep(500);
          }

          if (cancelRequestedForBatchId === batchId) {
            break;
          }

          batchPausedForDecision = null;
          batchResumed = null;
        }
      }

      successCount++;
      await saveSyncLog({
        profileName: profileName ?? "",
        namespace,
        type: "batch",
        batchId,
        userName,
        userEmail,
        userId,
        serviceName,
        oldVersion,
        newVersion: desiredVersion,
        oldPodCount,
        newPodCount: desiredPodCount,
        status: healthFailed ? "failure" : "success",
        errorMessage: healthFailed ? healthErrorMsg : undefined,
      });
      websocketManager.broadcast("SYNC_COMPLETE", {
        namespace,
        serviceName,
        status: "success",
      });
    } catch (error: any) {
      errorCount++;
      await saveSyncLog({
        profileName: profileName ?? "",
        namespace,
        type: "batch",
        batchId,
        userName,
        userEmail,
        userId,
        serviceName,
        oldVersion,
        newVersion: desiredVersion,
        oldPodCount,
        newPodCount: desiredPodCount,
        status: "failure",
        errorMessage: error?.message ?? String(error),
      });
      websocketManager.broadcast("SYNC_COMPLETE", {
        namespace,
        serviceName,
        status: "error",
        error: error?.message ?? String(error),
      });
    }

    await sleep(BETWEEN_SERVICES_DELAY_MS);
  }

  currentBatchId = null;
  cancelRequestedForBatchId = null;
  batchPausedForDecision = null;
  batchResumed = null;

  // Send batch health summary when there are failing services OR user had clicked Continue (so they get a report even if re-check passed)
  const failingServices = healthReports.filter(
    (hr) => hr.report.severity === "error" || hr.report.severity === "warning"
  );
  const shouldSendSummary = failingServices.length > 0 || hadResumeThisBatch;
  if (shouldSendSummary) {
    const summaryPayload = {
      batchId,
      namespace,
      total: servicesData.length,
      successCount,
      errorCount,
      hadResumeThisBatch: hadResumeThisBatch && failingServices.length === 0,
      failingServices: failingServices.map((hr) => ({
        serviceName: hr.serviceName,
        severity: hr.report.severity,
        summary: hr.report.summary,
        issueCount: hr.report.issues?.length ?? 0,
        report: hr.report,
      })),
    };
    console.log("[BATCH_REPORT] Sending BATCH_HEALTH_SUMMARY once, batchId:", batchId, "failingCount:", failingServices.length, "hadResume:", hadResumeThisBatch);
    websocketManager.broadcast("BATCH_HEALTH_SUMMARY", summaryPayload);
  }
  hadResumeThisBatch = false;
  console.log("[BATCH_REPORT] Sending BATCH_SYNC_COMPLETE, batchId:", batchId);

  websocketManager.broadcast("BATCH_SYNC_COMPLETE", {
    namespace,
    total: servicesData.length,
    successCount,
    errorCount,
    mode: "SMART_ROLLOUT_GUARD",
    batchId,
  });
};

export const handleCancelBatchSync = async (req: Request, res: Response): Promise<void> => {
  const { batchId } = req.body ?? {};
  if (batchId && typeof batchId === "string" && currentBatchId === batchId) {
    cancelRequestedForBatchId = batchId;
    batchPausedForDecision = null; // Clear pause so loop can exit
    res.status(200).json({ message: "Cancel requested", batchId });
  } else {
    res.status(400).json({ error: "No active batch to cancel or invalid batchId" });
  }
};

export const handleResumeBatchSync = async (req: Request, res: Response): Promise<void> => {
  const batchId = typeof req.body?.batchId === "string" ? req.body.batchId : null;
  if (batchId && currentBatchId === batchId) {
    batchResumed = batchId;
    hadResumeThisBatch = true; // so we send BATCH_HEALTH_SUMMARY at end even if re-check passes
    batchPausedForDecision = null; // If paused, loop continues; if not yet paused, batchResumed is seen when we enter the loop
    res.status(200).json({ message: "Resume requested", batchId });
  } else {
    res.status(400).json({ error: "No active batch to resume or invalid batchId" });
  }
};

export const getSyncLogs = async (req: Request, res: Response): Promise<void> => {
  const profileName = typeof req.query?.profileName === "string" ? req.query.profileName.trim() : undefined;
  const serviceName = typeof req.query?.serviceName === "string" ? req.query.serviceName.trim() : undefined;
  const userName = typeof req.query?.userName === "string" ? req.query.userName.trim() : undefined;
  const status = typeof req.query?.status === "string" && (req.query.status === "success" || req.query.status === "failure") ? req.query.status : undefined;
  const batchId = typeof req.query?.batchId === "string" ? req.query.batchId.trim() : undefined;
  const from = typeof req.query?.from === "string" ? req.query.from : undefined; // ISO date string
  const to = typeof req.query?.to === "string" ? req.query.to : undefined;
  const limit = Math.min(Math.max(parseInt(String(req.query?.limit), 10) || 100, 1), 500);
  const skip = Math.max(parseInt(String(req.query?.skip), 10) || 0, 0); // pagination offset

  try {
    const filter: Record<string, unknown> = {};
    if (profileName) filter.profileName = { $regex: profileName, $options: "i" };
    if (serviceName) filter.serviceName = { $regex: serviceName, $options: "i" };
    if (userName) filter.userName = { $regex: userName, $options: "i" };
    if (status) filter.status = status;
    if (batchId) filter.batchId = batchId; // exact match: show all logs from this batch
    if (from || to) {
      filter.timestamp = {};
      if (from) (filter.timestamp as Record<string, Date>).$gte = new Date(from);
      if (to) (filter.timestamp as Record<string, Date>).$lte = new Date(to);
    }

    const logs = await SyncLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    const total = await SyncLog.countDocuments(filter);
    res.json({ logs, total });
  } catch (err) {
    console.error("getSyncLogs error:", err);
    res.status(500).json({ error: "Failed to fetch sync logs" });
  }
};
