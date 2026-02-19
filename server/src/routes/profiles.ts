import { Router } from "express";
import { getProfileById, createProfile, getProfiles, updateProfile, getProfilePermissions, addUserToProfile, updateUserRole, removeUserFromProfile, getFullProfiles, getAllProfiles, requestToJoinProfile, getProfileJoinRequests, approveJoinRequest, rejectJoinRequest, getUserRequestHistory, bulkApproveRequests, bulkRejectRequests, inviteUserToProfile } from "../controllers/profilesController";
import WebSocketManager from "../websockets/websocketServer";
import { createTemporaryNamespace } from "../controllers/temporaryNamespaceController";
import { authenticate } from "../middlewares/AuthMiddleware";

const profilesRoutes = (websocketManager: WebSocketManager, monitoredNamespaces: Set<string>) => {
    const router = Router();
    router.use(authenticate);

    router.get("/all", getAllProfiles); // Get all profiles for browsing
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
    // Join request endpoints
    router.post("/:profileId/request", requestToJoinProfile);
    router.get("/:profileId/requests", getProfileJoinRequests);
    router.post("/:profileId/requests/:requestId/approve", approveJoinRequest);
    router.post("/:profileId/requests/:requestId/reject", rejectJoinRequest);
    router.post("/:profileId/requests/bulk-approve", bulkApproveRequests);
    router.post("/:profileId/requests/bulk-reject", bulkRejectRequests);
    router.post("/:profileId/invite", inviteUserToProfile);
    // User request history
    router.get("/requests/history", getUserRequestHistory);
    
    return router;
}

export default profilesRoutes