import { Request, Response } from "express";
import { OpenShiftService } from "../services/openshiftService";
import WebSocketManager from "../websockets/websocketServer";
import { DeploymentService } from "../services/openshift/DeploymentService";
import { KubernetesConfig } from "../clients/KubernetesClient";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
    saToken,
    clusterUrl,
  } = req.body;

  if (
    !namespace ||
    !serviceName ||
    !desiredVersion ||
    desiredPodCount == null ||
    !saToken ||
    !clusterUrl
  ) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    await OpenShiftService.syncService(
      namespace,
      serviceName,
      desiredVersion,
      desiredPodCount,
      saToken,
      clusterUrl,
      websocketManager,
    );

    res
      .status(200)
      .json({ message: `Service ${serviceName} synced successfully` });
  } catch (error: any) {
    console.error(`Error syncing service ${serviceName}:`, error);
    res.status(500).json({ error: error?.message ?? "Failed to sync service" });
  }
};

export const handleMultipleSyncService = async (
  req: Request,
  res: Response,
  websocketManager: WebSocketManager,
): Promise<void> => {
  const { namespace, servicesData, saToken, clusterUrl } = req.body;

  if (!namespace || !Array.isArray(servicesData) || !saToken || !clusterUrl) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const config: KubernetesConfig = { token: saToken, clusterUrl };
  const deploymentService = new DeploymentService(config);

  // ✅ response once
  res.status(202).json({
    message: "Smart batch sync started",
    total: servicesData.length,
  });

  websocketManager.broadcast("BATCH_SYNC_STARTED", {
    namespace,
    total: servicesData.length,
    mode: "SMART_ROLLOUT_GUARD",
  });

  let successCount = 0;
  let errorCount = 0;

  const BETWEEN_SERVICES_DELAY_MS = 500;

  for (const service of servicesData) {
    const serviceName = service?.name;
    const desiredVersion = service?.desiredVersion;
    const desiredPodCount = service?.desiredPodCount;

    if (!serviceName || !desiredVersion || desiredPodCount == null) {
      errorCount++;
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

      successCount++;
      websocketManager.broadcast("SYNC_COMPLETE", {
        namespace,
        serviceName,
        status: "success",
      });
    } catch (error: any) {
      errorCount++;

      websocketManager.broadcast("SYNC_COMPLETE", {
        namespace,
        serviceName,
        status: "error",
        error: error?.message ?? String(error),
      });
    }

    await sleep(BETWEEN_SERVICES_DELAY_MS);
  }

  websocketManager.broadcast("BATCH_SYNC_COMPLETE", {
    namespace,
    total: servicesData.length,
    successCount,
    errorCount,
    mode: "SMART_ROLLOUT_GUARD",
  });
};
