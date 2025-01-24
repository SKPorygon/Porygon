import { NextFunction, Response } from "express";
import { MyUserRequest } from "src/express";
import { Profile } from "src/models/Profile";
import { TestingProfile } from "src/models/TestingProfile";
import User from "src/models/User";

export const canActivateTestingProfile = async (req: MyUserRequest, res: Response, next: NextFunction) => {
    try {
      const { profileId, testingProfileId } = req.body;
      const userId = req.userId;
  
      const user = await User.findById(userId);
  
      if (!user) return res.status(404).json({ error: "User not found" });

      if (user.role === "admin") {
        return next();
      }
  
      // 2. Fetch profile and testing profile
      const profile = await Profile.findById(profileId);
      const testingProfile = await TestingProfile.findById(testingProfileId);
  
      if (!profile) return res.status(404).json({ error: "Profile not found" });
      if (!testingProfile) return res.status(404).json({ error: "Testing profile not found" });
  
      // 3. Check if user is in the profile admins
      const isAdmin = profile.admins.some((adminId) => adminId.toString() === userId);
  
      // 4. Check if user created the testing profile
      const isCreator = testingProfile.createdBy.toString() === userId;
  
      // 5. Allow access if user is profile admin or testing profile creator
      if (isAdmin || isCreator) {
        return next();
      }
  
      return res.status(403).json({ error: "You do not have permission to activate this testing profile" });
    } catch (error) {
      console.error("Permission check failed:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
  