import { IService } from "./Service";
import mongoose, { Schema, Document, Types } from "mongoose";

const permissionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["viewer", "editor", "admin"], required: true },
});

export interface IProfile extends Document {
  name: string;
  namespace: string;
  services: IService[];
  testingProfiles: Types.ObjectId[];
  permissions: [
    {
      user: Types.ObjectId; // ID of the user allowed access
      role: String; // e.g., 'admin', 'editor', 'viewer'
    }
  ];
  clusterUrl: string;
  saToken: string;
}

const ProfileSchema = new Schema<IProfile>(
  {
    name: { type: String, required: true },
    namespace: { type: String, required: true },
    services: [
      {
        name: { type: String, required: true },
        version: { type: String, required: true },
        underTest: { type: Boolean, default: false },
        podCount: { type: Number, required: true },
        note: { type: String },
        testGroupId: { type: String },
        previousVersion: { type: String },
      },
    ],
    testingProfiles: [{ type: Schema.Types.ObjectId, ref: "TestingProfile" }],
    permissions: [permissionSchema],
    clusterUrl: { type: String, required: true },
    saToken: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const Profile = mongoose.model<IProfile>("Profile", ProfileSchema);

export const profiles: IProfile[] = [];
