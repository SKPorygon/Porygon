import { Request, Response } from "express";
import { TestingProfile } from "../models/TestingProfile";
import { Profile } from "../models/Profile";
import { logAction } from "../middlewares/loggingMiddleware";
import { MyUserRequest } from "../express";

// Get all testing profiles
export const getAllTestingProfiles = async (req: Request, res: Response) => {
  try {
    const testingProfiles = await TestingProfile.find();
    res.status(200).json(testingProfiles);
  } catch (error) {
    console.error("Error fetching testing profiles:", error);
    res.status(500).json({ error: "Failed to fetch testing profiles" });
  }
};

// Create a new testing profile
export const createTestingProfile = async (req: Request, res: Response) => {
  try {
    const { name, profileId, services, createdBy } = req.body;
    console.log(
      "creating a new testing profile with this deatils: " +
        name +
        " " +
        profileId +
        " " +
        JSON.stringify(services)
    );

    // Find the related profile
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Create a new testing profile
    const newTestingProfile = await TestingProfile.create({
      name,
      profileId,
      services,
      isActive: false,
      createdBy
    });

    // Add the testing profile to the profile's testingProfiles array
    profile.testingProfiles.push(newTestingProfile.id);
    await profile.save();

    return res.status(201).json(newTestingProfile);
  } catch (error) {
    console.error("Error creating testing profile:", error);
    return res.status(500).json({ error: "Failed to create testing profile" });
  }
};

// Activate a testing profile
export const activateTestingProfile = async (req: MyUserRequest, res: Response) => {
  try {
    const { profileId, testingProfileId } = req.body;

    // Find the profile and testing profile
    const profile = await Profile.findById(profileId).populate(
      "testingProfiles"
    );
    const testingProfile = await TestingProfile.findById(testingProfileId);

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    if (!req.userId) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!testingProfile) {
      return res.status(404).json({ error: "Testing profile not found" });
    }

    // Activate the testing profile and update services
    testingProfile.isActive = true;
    await testingProfile.save();

    const action = testingProfile.isActive ? "Activate Testing Profile" : "Deactivate Testing Profile";
    await logAction(req.userId, action, profileId, {
      testingProfileId,
      testingProfileName: testingProfile.name,
    });

    profile.services.forEach((service) => {
      const testingService = testingProfile.services.find(
        (s) => s.name === service.name
      );
      if (testingService) {
        service.previousVersion = service.version;
        service.version = testingService.desiredVersion;
      }
    });

    await profile.save();

    // Re-fetch profile with populated testingProfiles
    const updatedProfile = await Profile.findById(profileId).populate(
      "testingProfiles"
    );

    return res
      .status(200)
      .json({
        message: "Testing profile activated successfully",
        profile: updatedProfile,
      });
  } catch (error) {
    console.error("Error activating testing profile:", error);
    return res
      .status(500)
      .json({ error: "Failed to activate testing profile" });
  }
};

// Deactivate a testing profile
export const deactivateTestingProfile = async (req: Request, res: Response) => {
  try {
    const { profileId, testingProfileId } = req.body;

    const profile = await Profile.findById(profileId).populate(
      "testingProfiles"
    );
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const testingProfile = await TestingProfile.findById(testingProfileId);
    if (!testingProfile) {
      return res.status(404).json({ error: "Testing profile not found" });
    }

    // Deactivate the testing profile and revert service versions
    testingProfile.isActive = false;
    await testingProfile.save();

    testingProfile.services.forEach((testService) => {
      const profileService = profile.services.find(
        (s) => s.name === testService.name
      );
      if (profileService && profileService.previousVersion) {
        profileService.version = profileService.previousVersion;
      }
    });

    await profile.save();

    // Re-fetch profile with populated testingProfiles
    const updatedProfile = await Profile.findById(profileId).populate(
      "testingProfiles"
    );

    return res
      .status(200)
      .json({
        message: "Testing profile deactivated successfully",
        profile: updatedProfile,
      });
  } catch (error) {
    console.error("Error deactivating testing profile:", error);
    return res
      .status(500)
      .json({ error: "Failed to deactivate testing profile" });
  }
};

// Update a testing profile
export const updateTestingProfile = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const updatedTestingProfile = await TestingProfile.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!updatedTestingProfile) {
      return res.status(404).json({ error: "Testing profile not found" });
    }

    return res.status(200).json(updatedTestingProfile);
  } catch (error) {
    console.error("Error updating testing profile:", error);
    return res.status(500).json({ error: "Failed to update testing profile" });
  }
};

// Delete a testing profile
export const deleteTestingProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { profileId } = req.body;

  try {
    // Delete the testing profile
    const testingProfile = await TestingProfile.findByIdAndDelete(id);
    if (!testingProfile) {
      return res.status(404).json({ error: "Testing profile not found" });
    }

    // Remove the testing profile reference from the related profile
    const profile = await Profile.findByIdAndUpdate(profileId, {
      $pull: { testingProfiles: id },
    });

    if(!profile) return res.status(404).json({ error: "Failed to Find related profile" });
    
    testingProfile.services.forEach((testService) => {
      const profileService = profile.services.find(
        (s) => s.name === testService.name
      );
      if (profileService && profileService.previousVersion) {
        profileService.version = profileService.previousVersion;
      }
    });

    profile?.save()

    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting testing profile:", error);
    return res.status(500).json({ error: "Failed to delete testing profile" });
  }
};
