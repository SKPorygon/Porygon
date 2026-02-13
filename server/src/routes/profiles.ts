import { Router } from "express";
import { getProfileById, createProfile, getProfiles, updateProfile, getProfilePermissions, addUserToProfile, updateUserRole, removeUserFromProfile, getFullProfiles } from "../controllers/profilesController";
import WebSocketManager from "../websockets/websocketServer";
import { createTemporaryNamespace } from "../controllers/temporaryNamespaceController";
import { authenticate } from "../middlewares/AuthMiddleware";

const profilesRoutes = (websocketManager: WebSocketManager, monitoredNamespaces: Set<string>) => {
    const router = Router();
    router.use(authenticate);

    router.get("/:id", getProfileById);
    router.put("/:id", updateProfile);
    router.get("/", getProfiles);
    router.get("/get/enriched", getFullProfiles)
    router.post("/", (req, res) => createProfile(req, res, websocketManager, monitoredNamespaces));
    router.post("/temp", (req, res) => createTemporaryNamespace(req, res, websocketManager));
    router.get("/:profileId/permissions", getProfilePermissions);
    router.post("/:profileId/permissions", addUserToProfile);
    router.put("/:profileId/permissions/:userId", updateUserRole);
    router.delete("/:profileId/permissions/:userId", removeUserFromProfile);
    
    return router;
}

export default profilesRoutes