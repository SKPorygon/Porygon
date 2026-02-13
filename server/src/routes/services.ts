import { Router } from "express";
import { fetchNamespaceDeployments, handleSyncService } from "../controllers/servicesController";
import WebSocketManager from '../websockets/websocketServer';

const createServicesRouter = (websocketManager: WebSocketManager) => {
    const router = Router();
  
    router.post("/", fetchNamespaceDeployments);
    router.post("/sync", (req, res) => handleSyncService(req, res, websocketManager)); // Pass WebSocketManager here
  
    return router;
  };

export default createServicesRouter;
