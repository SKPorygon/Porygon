import { Request, Response } from "express";
import { Profile } from "../models/Profile";
// import { checkUserPermissions, setupNamespaceAccessWithUserAuth } from "../services/openshiftService";
import { OpenShiftService } from "../services/openshiftService";
import { createFullyUpdatedProfile } from "../services/ProfilesService";
import WebSocketManager from "../websockets/websocketServer";
import { monitorOpenShiftChanges } from "../utils/openshiftPoller";
import { MyUserRequest } from "src/express";
import User from "../models/User";
import { ProfileJoinRequest } from "../models/ProfileJoinRequest";
import mongoose from "mongoose";

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
    const saToken = await OpenShiftService.setupNamespaceAccessWithUserAuth(
      namespace,
      "porygon-sa",
      userToken,
      clusterUrl
    );

    console.log("before has permissions")

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

// Helper function to check if user is admin or editor for a profile
const hasAdminOrEditorAccess = (profile: any, userId: string | undefined): boolean => {
  if (!userId) return false;
  const permission = profile.permissions.find(
    (perm: any) => perm.user.toString() === userId.toString()
  );
  return permission && (permission.role === "admin" || permission.role === "editor");
};

// Get all profiles (for browsing - users can see all profiles)
export const getAllProfiles = async (req: MyUserRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    // Get all profiles
    const allProfiles = await Profile.find({}).populate("testingProfiles").lean();

    // Get user's existing permissions
    const userPermissions = await Profile.find({
      "permissions": { $elemMatch: { user: userId } },
    }).select("_id").lean();

    // Get user's pending requests
    const userPendingRequests = await ProfileJoinRequest.find({
      user: userId,
      status: "pending",
    }).lean();

    const userProfileIdsWithAccess = new Set(
      userPermissions.map((p: any) => p._id.toString())
    );

    const userProfileIdsWithPendingRequests = new Set(
      userPendingRequests.map((r: any) => r.profile.toString())
    );

    // Enrich profiles with user's access status
    const enrichedProfiles = allProfiles.map((profile: any) => {
      const hasAccess = userProfileIdsWithAccess.has(profile._id.toString());
      const requestPending = userProfileIdsWithPendingRequests.has(profile._id.toString());
      const permission = profile.permissions.find(
        (perm: any) => perm.user.toString() === userId
      );
      
      return {
        ...profile,
        hasAccess,
        requestPending,
        userRole: permission?.role || null,
        canRequest: !hasAccess && !requestPending,
      };
    });

    res.status(200).json(enrichedProfiles);
  } catch (error) {
    console.error("Error fetching all profiles:", error);
    res.status(500).json({ error: "Failed to fetch profiles" });
  }
};

// Request to join a profile
export const requestToJoinProfile = async (req: MyUserRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const { requestedRole } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    // Check if user already has access
    const existingPermission = profile.permissions.find(
      (perm) => perm.user.toString() === userId
    );
    if (existingPermission) {
      return res.status(400).json({ error: "You already have access to this profile." });
    }

    // Check if there's already a pending request
    const existingRequest = await ProfileJoinRequest.findOne({
      profile: profileId,
      user: userId,
      status: "pending",
    });

    if (existingRequest) {
      return res.status(400).json({ error: "You already have a pending request for this profile." });
    }

    // Create the request
    const joinRequest = await ProfileJoinRequest.create({
      profile: profileId,
      user: userId,
      requestedRole: requestedRole || "viewer",
      status: "pending",
    });

    const populatedRequest = await ProfileJoinRequest.findById(joinRequest._id)
      .populate("user", "name email")
      .populate("profile", "name");

    return res.status(201).json(populatedRequest);
  } catch (error: any) {
    console.error("Error creating join request:", error);
    if (error.code === 11000) {
      return res.status(400).json({ error: "A pending request already exists for this profile." });
    }
    return res.status(500).json({ error: "An error occurred while creating the join request." });
  }
};

// Get pending requests for a profile (admin/editor only)
export const getProfileJoinRequests = async (req: MyUserRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    // Check if user has admin or editor access
    if (!hasAdminOrEditorAccess(profile, userId)) {
      return res.status(403).json({ error: "You don't have permission to view requests for this profile." });
    }

    const requests = await ProfileJoinRequest.find({
      profile: profileId,
      status: "pending",
    })
      .populate("user", "name email")
      .sort({ requestedAt: -1 });

    return res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching join requests:", error);
    return res.status(500).json({ error: "An error occurred while fetching join requests." });
  }
};

// Approve a join request (admin/editor only)
export const approveJoinRequest = async (req: MyUserRequest, res: Response) => {
  try {
    const { profileId, requestId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    // Check if user has admin or editor access
    if (!hasAdminOrEditorAccess(profile, userId)) {
      return res.status(403).json({ error: "You don't have permission to approve requests for this profile." });
    }

    const joinRequest = await ProfileJoinRequest.findById(requestId)
      .populate("user", "name email");
    
    if (!joinRequest) {
      return res.status(404).json({ error: "Join request not found." });
    }

    if (joinRequest.profile.toString() !== profileId) {
      return res.status(400).json({ error: "Request does not belong to this profile." });
    }

    if (joinRequest.status !== "pending") {
      return res.status(400).json({ error: "Request has already been processed." });
    }

    // Check if user is already in the profile
    const existingPermission = profile.permissions.find(
      (perm) => perm.user.toString() === joinRequest.user._id.toString()
    );
    if (existingPermission) {
      // Mark request as approved even though user already has access
      joinRequest.status = "approved";
      joinRequest.reviewedAt = new Date();
      joinRequest.reviewedBy = new mongoose.Types.ObjectId(userId as string);
      await joinRequest.save();
      return res.status(200).json({ message: "User already has access to this profile." });
    }

    // Add user to profile permissions
    profile.permissions.push({
      user: joinRequest.user._id,
      role: joinRequest.requestedRole,
    });
    await profile.save();

    // Update request status - userId is guaranteed to be defined here due to check above
    joinRequest.status = "approved";
    joinRequest.reviewedAt = new Date();
    joinRequest.reviewedBy = new mongoose.Types.ObjectId(userId as string);
    await joinRequest.save();

    // Ensure user is populated
    const populatedUser = joinRequest.user as any;
    return res.status(200).json({
      message: "Join request approved successfully.",
      user: { name: populatedUser.name, id: populatedUser._id },
      role: joinRequest.requestedRole,
    });
  } catch (error) {
    console.error("Error approving join request:", error);
    return res.status(500).json({ error: "An error occurred while approving the join request." });
  }
};

// Get user's own request history
export const getUserRequestHistory = async (req: MyUserRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const requests = await ProfileJoinRequest.find({
      user: userId,
    })
      .populate("profile", "name namespace")
      .populate({
        path: "reviewedBy",
        select: "name email",
        model: "User",
      })
      .sort({ requestedAt: -1 });

    return res.status(200).json(requests);
  } catch (error) {
    console.error("Error fetching user request history:", error);
    return res.status(500).json({ error: "An error occurred while fetching request history." });
  }
};

// Bulk approve requests (admin/editor only)
export const bulkApproveRequests = async (req: MyUserRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const { requestIds } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ error: "Request IDs array is required." });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    // Check if user has admin or editor access
    if (!hasAdminOrEditorAccess(profile, userId)) {
      return res.status(403).json({ error: "You don't have permission to approve requests for this profile." });
    }

    const requests = await ProfileJoinRequest.find({
      _id: { $in: requestIds },
      profile: profileId,
      status: "pending",
    }).populate("user", "name email");

    const results = {
      approved: [] as any[],
      failed: [] as any[],
    };

    for (const request of requests) {
      try {
        const populatedUser = request.user as any;
        
        // Check if user is already in the profile
        const existingPermission = profile.permissions.find(
          (perm) => perm.user.toString() === populatedUser._id.toString()
        );
        
        if (!existingPermission) {
          // Add user to profile permissions
          profile.permissions.push({
            user: populatedUser._id,
            role: request.requestedRole,
          });
        }

        // Update request status
        request.status = "approved";
        request.reviewedAt = new Date();
        request.reviewedBy = new mongoose.Types.ObjectId(userId as string);
        await request.save();

        results.approved.push({
          requestId: request._id,
          userName: populatedUser.name || populatedUser.email || "Unknown",
          role: request.requestedRole,
        });
      } catch (error) {
        results.failed.push({
          requestId: request._id,
          error: "Failed to approve request",
        });
      }
    }

    await profile.save();

    return res.status(200).json({
      message: `Approved ${results.approved.length} request(s)`,
      results,
    });
  } catch (error) {
    console.error("Error bulk approving requests:", error);
    return res.status(500).json({ error: "An error occurred while bulk approving requests." });
  }
};

// Bulk reject requests (admin/editor only)
export const bulkRejectRequests = async (req: MyUserRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const { requestIds } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ error: "Request IDs array is required." });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    // Check if user has admin or editor access
    if (!hasAdminOrEditorAccess(profile, userId)) {
      return res.status(403).json({ error: "You don't have permission to reject requests for this profile." });
    }

    const requests = await ProfileJoinRequest.find({
      _id: { $in: requestIds },
      profile: profileId,
      status: "pending",
    });

    const results = {
      rejected: [] as any[],
      failed: [] as any[],
    };

    for (const request of requests) {
      try {
        request.status = "rejected";
        request.reviewedAt = new Date();
        request.reviewedBy = new mongoose.Types.ObjectId(userId as string);
        await request.save();

        results.rejected.push({
          requestId: request._id,
        });
      } catch (error) {
        results.failed.push({
          requestId: request._id,
          error: "Failed to reject request",
        });
      }
    }

    return res.status(200).json({
      message: `Rejected ${results.rejected.length} request(s)`,
      results,
    });
  } catch (error) {
    console.error("Error bulk rejecting requests:", error);
    return res.status(500).json({ error: "An error occurred while bulk rejecting requests." });
  }
};

// Invite user to profile (admin/editor only) - creates request automatically approved
export const inviteUserToProfile = async (req: MyUserRequest, res: Response) => {
  try {
    const { profileId } = req.params;
    const { email, role } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    if (!email || !role) {
      return res.status(400).json({ error: "Email and role are required." });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    // Check if user has admin or editor access
    if (!hasAdminOrEditorAccess(profile, userId)) {
      return res.status(403).json({ error: "You don't have permission to invite users to this profile." });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found with this email." });
    }

    // Check if user already has access
    const existingPermission = profile.permissions.find(
      (perm) => perm.user.toString() === user._id.toString()
    );
    if (existingPermission) {
      return res.status(400).json({ error: "User already has access to this profile." });
    }

    // Add user to profile permissions directly (auto-approved invite)
    profile.permissions.push({
      user: user._id,
      role,
    });
    await profile.save();

    // Create an approved request record for history
    const inviteRequest = await ProfileJoinRequest.create({
      profile: profileId,
      user: user._id,
      requestedRole: role,
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: new mongoose.Types.ObjectId(userId as string),
    });

    const populatedRequest = await ProfileJoinRequest.findById(inviteRequest._id)
      .populate("user", "name email")
      .populate("profile", "name");

    return res.status(201).json({
      message: "User invited successfully",
      request: populatedRequest,
    });
  } catch (error) {
    console.error("Error inviting user:", error);
    return res.status(500).json({ error: "An error occurred while inviting the user." });
  }
};

// Reject a join request (admin/editor only)
export const rejectJoinRequest = async (req: MyUserRequest, res: Response) => {
  try {
    const { profileId, requestId } = req.params;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found." });
    }

    // Check if user has admin or editor access
    if (!hasAdminOrEditorAccess(profile, userId)) {
      return res.status(403).json({ error: "You don't have permission to reject requests for this profile." });
    }

    const joinRequest = await ProfileJoinRequest.findById(requestId);
    
    if (!joinRequest) {
      return res.status(404).json({ error: "Join request not found." });
    }

    if (joinRequest.profile.toString() !== profileId) {
      return res.status(400).json({ error: "Request does not belong to this profile." });
    }

    if (joinRequest.status !== "pending") {
      return res.status(400).json({ error: "Request has already been processed." });
    }

    // Update request status - userId is guaranteed to be defined here due to check above
    joinRequest.status = "rejected";
    joinRequest.reviewedAt = new Date();
    joinRequest.reviewedBy = new mongoose.Types.ObjectId(userId as string);
    await joinRequest.save();

    return res.status(200).json({ message: "Join request rejected successfully." });
  } catch (error) {
    console.error("Error rejecting join request:", error);
    return res.status(500).json({ error: "An error occurred while rejecting the join request." });
  }
};

