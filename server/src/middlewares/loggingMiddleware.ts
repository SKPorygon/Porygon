import { MyUserRequest } from "src/express";
import Log from "../models/Log";
import { Request, Response, NextFunction } from "express";

export const logAction = async (
  userId: string,
  action: string,
  profileId?: string,
  details?: Record<string, any>
) => {
  try {
    console.log("hello in ze try log")
    const log = new Log({ user: userId, action, profileId, details });
    await log.save();
  } catch (err) {
    console.error("Error logging action:", err);
  }
};

export const logMiddleware =
  (action: string, profileKey: string = "profileId") =>
  async (req: MyUserRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    if (!userId) return next();

    const profileId = req.params[profileKey];
    const details = req.body;

    await logAction(userId, action, profileId, details);
    next();
  };
