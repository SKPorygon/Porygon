import { Router } from "express";
import { fetchNamespaceDeployments, handleSyncService, handleMultipleSyncService } from "../controllers/servicesController";
import WebSocketManager from '../websockets/websocketServer';

const createServicesRouter = (websocketManager: WebSocketManager) => {
    const router = Router();
  
    router.post("/", fetchNamespaceDeployments);
    router.post("/sync", (req, res) => handleSyncService(req, res, websocketManager));
    router.post("/multiple-sync", (req, res) => handleMultipleSyncService(req, res, websocketManager));
  
    return router;
  };

export default createServicesRouter;
