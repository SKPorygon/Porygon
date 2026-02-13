import { Router } from "express";
import Log from "../models/Log";
import { authenticate } from "../middlewares/AuthMiddleware";

const router = Router();

// POST /api/logs - Record a new log
router.post("/", authenticate, async (req, res) => {
  try {
    const { userId, action, profileId, details } = req.body;
    const log = new Log({ userId, action, profileId, details });
    await log.save();
    res.status(201).json(log);
  } catch (err) {
    console.error("Error creating log:", err);
    res.status(500).json({ error: "Failed to create log" });
  }
});

// GET /api/logs - Fetch logs with filters
router.get("/", authenticate, async (req, res) => {
  try {
    const { userId, profileId, action, startDate, endDate } = req.query;

    const filters: Record<string, any> = {};
    if (userId) filters.user = userId;
    if (profileId) filters.profileId = profileId;
    if (action) filters.action = action;
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.$gte = new Date(startDate as string);
      if (endDate) filters.timestamp.$lte = new Date(endDate as string);
    }

    const logs = await Log.find(filters).sort({ timestamp: -1 }).lean().populate("user profileId");
    res.status(200).json(logs);
  } catch (err) {
    console.error("Error fetching logs:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

export default router;
