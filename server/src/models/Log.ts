import mongoose, { Schema, Document } from "mongoose";

export interface ILog extends Document {
  user: string;
  action: string;
  profileId?: string;
  timestamp: Date;
  details?: Record<string, any>;
}

const LogSchema: Schema = new Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  timestamp: { type: Date, default: Date.now },
  details: { type: Object },
});

export default mongoose.model<ILog>("Log", LogSchema);
