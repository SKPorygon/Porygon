import { Router } from "express";
import { fetchNamespaceServices, handleSyncService } from "../controllers/servicesController";
import WebSocketManager from '../websockets/websocketServer';

const createServicesRouter = (websocketManager: WebSocketManager) => {
    const router = Router();
  
    router.post("/", fetchNamespaceServices);
    router.post("/sync", (req, res) => handleSyncService(req, res, websocketManager)); // Pass WebSocketManager here
  
    return router;
  };

export default createServicesRouter;
