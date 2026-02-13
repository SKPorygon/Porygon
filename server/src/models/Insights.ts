import mongoose from "mongoose";

const InsightsSchema = new mongoose.Schema({
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: "Profile", required: true },
  testingProfileId: { type: mongoose.Schema.Types.ObjectId, ref: "TestingProfile", required: true },
  serviceLogs: [
    {
      serviceName: { type: String, required: true },
      status: { type: String, enum: ["success", "failure", "retry"], required: true },
      error: { type: String, default: null },
    },
  ],
  successRate: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Insights", InsightsSchema);
