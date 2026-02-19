import mongoose, { Schema, Document } from "mongoose";

export interface ISyncLog extends Document {
  profileName: string;
  namespace: string;
  type: "single" | "batch";
  batchId?: string;
  userName: string;
  userEmail?: string;
  userId?: string;
  serviceName: string;
  oldVersion?: string;
  newVersion: string;
  oldPodCount?: number;
  newPodCount?: number;
  status: "success" | "failure";
  errorMessage?: string;
  timestamp: Date;
}

const SyncLogSchema: Schema = new Schema(
  {
    profileName: { type: String, required: true, index: true },
    namespace: { type: String, required: true },
    type: { type: String, enum: ["single", "batch"], required: true },
    batchId: { type: String, index: true },
    userName: { type: String, required: true, index: true },
    userEmail: { type: String },
    userId: { type: String },
    serviceName: { type: String, required: true, index: true },
    oldVersion: { type: String },
    newVersion: { type: String, required: true },
    oldPodCount: { type: Number },
    newPodCount: { type: Number },
    status: { type: String, enum: ["success", "failure"], required: true, index: true },
    errorMessage: { type: String },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

export default mongoose.model<ISyncLog>("SyncLog", SyncLogSchema);
