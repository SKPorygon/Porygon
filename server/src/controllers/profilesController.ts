import { Request, Response } from "express";
import { Profile } from "../models/Profile";
import { checkUserPermissions, setupNamespaceAccessWithUserAuth } from "../services/openshiftService";
import { createFullyUpdatedProfile } from "../services/ProfilesService";
import WebSocketManager from "../websockets/websocketServer";
import { monitorOpenShiftChanges } from "../utils/openshiftPoller";
import { MyUserRequest } from "src/express";
import User from "../models/User";

// Fetch a single profile by ID
export const getProfileById = async (req: MyUserRequest, res: Response) => {
  const { id } = req.params;

  try {
    const profile = await Profile.findById(id).populate("testingProfiles");
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
};

// Update a profile by ID
export const updateProfile = async (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params;
  const { name, namespace, services } = req.body;

  try {
    const updatedProfile = await Profile.findByIdAndUpdate(
      id,
      { name, namespace, services },
      { new: true }
    ).populate("testingProfiles");

    if (!updatedProfile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.status(200).json({ message: "Profile updated successfully", profile: updatedProfile });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
};

export const getProfiles = async (req: MyUserRequest, res: Response) => {
  try {
    const userId = req.userId;

    const profiles = await Profile.find({
      "permissions": { $elemMatch: { user: userId } },
    }).populate("testingProfiles");

    res.status(200).json(profiles);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
};

export const getFullProfiles = async (req: MyUserRequest, res: Response) => {
  try {
    const userId = req.userId;

    const profiles = await Profile.find({
      "permissions": { $elemMatch: { user: userId } },
    }).populate("testingProfiles");

    // Optionally, enrich profiles if needed
    const enrichedProfiles = await Promise.all(
      profiles.map(async (profile) => {
        return await createFullyUpdatedProfile(profile.toObject());
      })
    );

    res.status(200).json(enrichedProfiles);
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
};

// Create a new profile
export const createProfile = async (
  req: MyUserRequest,
  res: Response,
  websocketManager: WebSocketManager,
  monitoredNamespaces: Set<string>
): Promise<void> => {
  try {
    const { name, namespace, services, userToken, clusterUrl } = req.body;

    // Validate the incoming data
    if (!name || !namespace || !Array.isArray(services) || !userToken || !clusterUrl) {
      res.status(400).json({ error: "Invalid profile data" });
      return;
    }

    // Setup namespace access with the user token
    const saToken = await setupNamespaceAccessWithUserAuth(
      namespace,
      "porygon-sa",
      userToken,
      clusterUrl
    );

    const hasPermission = await checkUserPermissions(
      namespace,
      saToken,
      clusterUrl,
      "services",
      "get"
    );

    if (hasPermission) {
      const initializedServices = services.map((service: any) => ({
        ...service,
        underTest: service.underTest ?? false,
        podCount: service.podCount ?? 1,
      }));

      const creatorPermissions = {
        user: req.userId,
        role: "admin"
      }

      // Create the profile in the database
      const profile = await Profile.create({
        name,
        namespace,
        services: initializedServices,
        clusterUrl,
        saToken,
        testingProfiles: [],
        permissions: [creatorPermissions]
      });

      // Optionally monitor the namespace for changes
      // monitorOpenShiftChanges(namespace, saToken, clusterUrl, websocketManager);

      res.status(201).json({ message: "Profile created successfully", profile });
    } else {
      res.status(403).json({
        message: `User with token: ${userToken} does not have permissions on cluster: ${clusterUrl}`,
      });
    }
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).json({ error: "Failed to create profile" });
  }
};

// Get permissions for a specific profile
export const getProfilePermissions = async (req: MyUserRequest, res: Response) => {
  try {
    const { profileId } = req.params;

    const profile = await Profile.findById(profileId).populate("permissions.user", "name email");
    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    return res.status(200).json(profile.permissions);
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return res.status(500).json({ error: "An error occurred while fetching permissions." });
  }
};

// Add a user to the profile
export const addUserToProfile = async (req: MyUserRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const { name, role } = req.body;

    console.log("yo in ze add user wiz: " + name +" " + role +" " + profileId)
    if (!name || !role) {
      return res.status(400).json({ error: "Full name and role are required." });
    }

    const user = await User.findOne({ name: name });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    // Check if the user is already in the permissions list
    const existingPermission = profile.permissions.find((perm) => perm.user.toString() === user._id.toString());
    if (existingPermission) {
      return res.status(400).json({ error: "User is already a member of this profile." });
    }

    // Add the user to the profile permissions
    profile.permissions.push({ user: user._id, role });
    await profile.save();

    return res.status(201).json({ user: { name: user.name, id: user._id }, role });
  } catch (error) {
    console.error("Error adding user to profile:", error);
    return res.status(500).json({ error: "An error occurred while adding the user." });
  }
};

// Update a user's role in the profile
export const updateUserRole = async (req: MyUserRequest, res: Response) => {
  try {
    const { profileId, userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ error: "Role is required." });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    const permission = profile.permissions.find((perm) => perm.user.toString() === userId);
    if (!permission) {
      return res.status(404).json({ error: "User not found in this profile's permissions." });
    }

    permission.role = role;
    await profile.save();

    return res.status(200).json({ message: "User role updated successfully." });
  } catch (error) {
    console.error("Error updating user role:", error);
    return res.status(500).json({ error: "An error occurred while updating the user's role." });
  }
};

// Remove a user from the profile
export const removeUserFromProfile = async (req: MyUserRequest, res: Response) => {
  try {
    const { profileId, userId } = req.params;

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    const permissionIndex = profile.permissions.findIndex((perm) => perm.user.toString() === userId);
    if (permissionIndex === -1) {
      return res.status(404).json({ error: "User not found in this profile's permissions." });
    }

    // Remove the user from the permissions list
    profile.permissions.splice(permissionIndex, 1);
    await profile.save();

    return res.status(200).json({ message: "User removed from the profile." });
  } catch (error) {
    console.error("Error removing user from profile:", error);
    return res.status(500).json({ error: "An error occurred while removing the user." });
  }
};

