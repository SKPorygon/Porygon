import { Router } from "express";
import { fetchNamespaceDeployments, handleSyncService, handleMultipleSyncService, handleCancelBatchSync, handleResumeBatchSync, getSyncLogs } from "../controllers/servicesController";
import WebSocketManager from '../websockets/websocketServer';

const createServicesRouter = (websocketManager: WebSocketManager) => {
    const router = Router();

    router.get("/sync-logs", getSyncLogs);
    router.post("/", fetchNamespaceDeployments);
    router.post("/sync", (req, res) => handleSyncService(req, res, websocketManager));
    router.post("/multiple-sync", (req, res) => handleMultipleSyncService(req, res, websocketManager));
    router.post("/sync/cancel", handleCancelBatchSync);
    router.post("/sync/resume", handleResumeBatchSync);

    return router;
  };

export default createServicesRouter;
