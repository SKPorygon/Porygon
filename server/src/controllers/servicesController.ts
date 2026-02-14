import { Request, Response } from "express";
import { OpenShiftService } from "../services/openshiftService";
import WebSocketManager from "../websockets/websocketServer"; // ✅ FIX: relative import

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const fetchNamespaceDeployments = async (
  req: Request,
  res: Response
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
      }
    );

    if (!response.ok) {
      const t = await response.text();
      throw new Error(
        `Failed to fetch deployments: ${response.status} ${response.statusText} - ${t}`
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
  websocketManager: WebSocketManager
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
      websocketManager
    );

    res.status(200).json({ message: `Service ${serviceName} synced successfully` });
  } catch (error: any) {
    console.error(`Error syncing service ${serviceName}:`, error);
    res.status(500).json({ error: error?.message ?? "Failed to sync service" });
  }
};

export const handleMultipleSyncService = async (
  req: Request,
  res: Response,
  websocketManager: WebSocketManager
): Promise<void> => {
  const SYNC_DELAY_MS = 8000;

  const { namespace, servicesData, saToken, clusterUrl } = req.body;

  if (!namespace || !Array.isArray(servicesData) || !saToken || !clusterUrl) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // ✅ send HTTP response once
  res.status(202).json({
    message: `Batch sync started`,
    total: servicesData.length,
  });

  // ✅ announce batch start via WS (optional but very useful)
  websocketManager.broadcast("BATCH_SYNC_STARTED", {
    namespace,
    total: servicesData.length,
  });

  let successCount = 0;
  let errorCount = 0;

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
        error: "Invalid service payload (missing name/desiredVersion/desiredPodCount)",
      });
      await sleep(SYNC_DELAY_MS);
      continue;
    }

    try {
      await OpenShiftService.syncService(
        namespace,
        serviceName,
        desiredVersion,
        desiredPodCount,
        saToken,
        clusterUrl,
        websocketManager
      );

      successCount++;
      console.log(`Synced service: ${serviceName}`);
    } catch (error: any) {
      errorCount++;
      console.error(`Error syncing service ${serviceName}:`, error);

      // ✅ DO NOT touch res here. Use WS.
      websocketManager.broadcast("SYNC_COMPLETE", {
        namespace,
        serviceName,
        status: "error",
        error: error?.message ?? String(error),
      });
    }

    await sleep(SYNC_DELAY_MS);
  }

  websocketManager.broadcast("BATCH_SYNC_COMPLETE", {
    namespace,
    total: servicesData.length,
    successCount,
    errorCount,
  });
};
