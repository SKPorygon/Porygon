import { Request, Response } from "express";
import { syncService } from "../services/openshiftService";
import WebSocketManager from "src/websockets/websocketServer";

export const fetchNamespaceServices = async (req: Request, res: Response): Promise<void> => {
    const { namespace, userToken, clusterUrl } = req.body;
  
    if (!namespace || !userToken || !clusterUrl) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
  
    try {
      const response = await fetch(`${clusterUrl}/api/v1/namespaces/${namespace}/services`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${userToken}`,
          "Content-Type": "application/json",
        },
      });
  
      if (!response.ok) {
        throw new Error(`Failed to fetch services: ${response.statusText}`);
      }
  
      const data = await response.json();
      const serviceNames = data.items.map((service: any) => service.metadata.name);
      res.json({ serviceNames });
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ error: "Failed to fetch services" });
    }
  };


  export const handleSyncService = async (req: Request, res: Response, websocketManager: WebSocketManager): Promise<any> => {
    const { namespace, serviceName, desiredVersion, desiredPodCount, saToken, clusterUrl } = req.body;
  
    if (!namespace || !serviceName || !desiredVersion || desiredPodCount == null || !saToken || !clusterUrl) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    try {
      await syncService(namespace, serviceName, desiredVersion, desiredPodCount, saToken, clusterUrl, websocketManager);
      console.log(`Synced service: ${serviceName}`);
      res.status(200).json({ message: `Service ${serviceName} synced successfully` });
    } catch (error) {
      console.error(`Error syncing service ${serviceName}:`, error);
      res.status(500).json({ error: "Failed to sync service" });
    }
  };
  