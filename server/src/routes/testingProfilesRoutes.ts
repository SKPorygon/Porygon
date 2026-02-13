// src/routes/testingProfilesRoutes.ts
import express from "express";
import {
  getAllTestingProfiles,
  createTestingProfile,
  updateTestingProfile,
  deleteTestingProfile,
  activateTestingProfile,
  deactivateTestingProfile
} from "../controllers/testingProfilesController";
import { authenticate } from "../middlewares/AuthMiddleware";

const router = express.Router();

router.get("/", getAllTestingProfiles);
router.post("/", createTestingProfile);
router.put("/:id", updateTestingProfile);
router.delete("/:id", deleteTestingProfile);
router.post("/activate", authenticate, activateTestingProfile);
router.post("/deactivate", authenticate, deactivateTestingProfile);

export default router;
