import Insights from "../models/Insights";
import { Request, Response } from "express";

export const getInsightsByProfile = async (req: Request, res: Response) => {
  try {
    const { profileId } = req.query;
    const insights = await Insights.find({ profileId }).populate("testingProfileId");

    if (!insights) {
      return res.status(404).json({ error: "No insights found for this profile." });
    }

    // Calculate recommendations
    const recommendations = insights.flatMap((insight) =>
      insight.serviceLogs
        .filter((log) => log.status === "failure")
        .map((log) => ({
          serviceName: log.serviceName,
          reason: "Failed in previous activation attempts.",
        }))
    );

    return res.status(200).json({
      successRate: insights.reduce((acc, insight) => acc + insight.successRate, 0) / insights.length,
      recommendations,
    });
  } catch (error) {
    console.error("Error fetching insights:", error);
    return res.status(500).json({ error: "Failed to fetch insights." });
  }
};