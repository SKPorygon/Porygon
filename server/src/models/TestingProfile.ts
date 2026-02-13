import mongoose, { Schema, Document, Types } from "mongoose";


export interface ITestingProfile extends Document {
    profileId: Types.ObjectId; // Reference to the Profile document
    name: string;
    services: {
      name: string;
      desiredVersion: string;
    }[];
    isActive: boolean;
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: Date;
    updatedAt: Date;
  }
  
  const TestingProfileSchema = new Schema<ITestingProfile>(
    {
      profileId: { type: Schema.Types.ObjectId, ref: "Profile", required: true },
      name: { type: String, required: true },
      services: [
        {
          name: { type: String, required: true },
          desiredVersion: { type: String, required: true },
        },
      ],
      isActive: { type: Boolean, default: false },
    },
    {
      timestamps: true,
    }
  );
  
  export const TestingProfile = mongoose.model<ITestingProfile>(
    "TestingProfile",
    TestingProfileSchema
  );
  