import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProfileJoinRequest extends Document {
  profile: Types.ObjectId;
  user: Types.ObjectId;
  status: "pending" | "approved" | "rejected";
  requestedRole: "viewer" | "editor" | "admin";
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
}

const ProfileJoinRequestSchema = new Schema<IProfileJoinRequest>(
  {
    profile: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
    },
    requestedRole: {
      type: String,
      enum: ["viewer", "editor", "admin"],
      default: "viewer",
      required: true,
    },
    requestedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  }
);

// Ensure one pending request per user per profile
ProfileJoinRequestSchema.index({ profile: 1, user: 1, status: 1 }, { unique: true });

export const ProfileJoinRequest = mongoose.model<IProfileJoinRequest>(
  "ProfileJoinRequest",
  ProfileJoinRequestSchema
);
