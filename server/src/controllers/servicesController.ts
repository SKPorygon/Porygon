import { Request, Response } from "express";
import { syncService } from "../services/openshiftService";
import WebSocketManager from "src/websockets/websocketServer";

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
): Promise<any> => {
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
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await syncService(
      namespace,
      serviceName,
      desiredVersion,
      desiredPodCount,
      saToken,
      clusterUrl,
      websocketManager,
    );
    console.log(`Synced service: ${serviceName}`);
    res
      .status(200)
      .json({ message: `Service ${serviceName} synced successfully` });
  } catch (error) {
    console.error(`Error syncing service ${serviceName}:`, error);
    res.status(500).json({ error: "Failed to sync service" });
  }
};
