import Updates from "../models/UpdatesModel.js";
import User from "../models/UserModel.js";
import Channel from "../models/ChannelModel.js";
import mongoose from "mongoose";
import { emitNewUpdate, emitUpdateUpdated, emitUpdateDeleted } from "../socket.js";

// Helper function to check if user is group admin
const isGroupAdmin = async (userId, groupId) => {
    try {
        // Validate inputs
        if (!userId || !groupId) {
            return false;
        }

        const channel = await Channel.findById(groupId);
        if (!channel) {
            return false;
        }
        
        // Check if user is the admin of this specific group
        return channel.adminId.toString() === userId.toString();
    } catch (error) {
        console.error("Error checking group admin status:", error);
        return false;
    }
};

// Helper function to check if user is group member
const isGroupMember = async (userId, groupId) => {
    try {
        const channel = await Channel.findById(groupId);
        if (!channel) {
            return false;
        }
        
        // Check if user is a member of this group
        return channel.members.some(memberId => memberId.toString() === userId.toString());
    } catch (error) {
        console.error("Error checking group membership:", error);
        return false;
    }
};

// Create a new update (Group Admin only)
export const createUpdate = async (req, res) => {
    try {
        const { title, description, link, priority, expiresAt, groupId } = req.body;
        const userId = req.userId;

        // Validate required fields
        if (!title || title.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: "Title is required"
            });
        }

        if (!groupId) {
            return res.status(400).json({
                success: false,
                error: "Group ID is required"
            });
        }

        // Check if user is group admin
        const userIsGroupAdmin = await isGroupAdmin(userId, groupId);
        if (!userIsGroupAdmin) {
            return res.status(403).json({
                success: false,
                error: "Access denied. Group admin privileges required."
            });
        }

        // Create the update
        const newUpdate = new Updates({
            title: title.trim(),
            description: description ? description.trim() : null,
            link: link ? link.trim() : null,
            priority: priority || 0,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            groupId: groupId,
            createdBy: userId
        });

        const savedUpdate = await newUpdate.save();
        
        // Populate the createdBy field for response
        await savedUpdate.populate('createdBy', 'firstName lastName email');

        // Emit real-time update to group members
        emitNewUpdate(savedUpdate);

        res.status(201).json({
            success: true,
            message: "Update created successfully",
            update: savedUpdate
        });

    } catch (error) {
        console.error("Error creating update:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

// Get all active updates for a specific group
export const getUpdates = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { limit = 10, page = 1 } = req.query;
        const userId = req.userId;
        const skip = (page - 1) * limit;

        // Validate groupId
        if (!groupId) {
            return res.status(400).json({
                success: false,
                error: "Group ID is required"
            });
        }

        // Check if user is group member
        const userIsGroupMember = await isGroupMember(userId, groupId);
        if (!userIsGroupMember) {
            return res.status(403).json({
                success: false,
                error: "Access denied. You must be a member of this group to view updates."
            });
        }

        // Get active updates for this group, sorted by priority (desc) then by creation date (desc)
        const updates = await Updates.find({
            groupId: groupId,
            isActive: true,
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        })
        .populate('createdBy', 'firstName lastName email')
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        // Get total count for pagination
        const totalCount = await Updates.countDocuments({
            groupId: groupId,
            isActive: true,
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        });

        res.json({
            success: true,
            updates,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(totalCount / limit),
                totalCount,
                hasMore: skip + updates.length < totalCount
            }
        });

    } catch (error) {
        console.error("Error fetching updates:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

// Get latest updates for carousel (Group-specific)
export const getLatestUpdates = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { limit = 5 } = req.query;
        const userId = req.userId;

        // Validate groupId
        if (!groupId) {
            return res.status(400).json({
                success: false,
                error: "Group ID is required"
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "User not authenticated"
            });
        }

        // Check if user is group member
        const userIsGroupMember = await isGroupMember(userId, groupId);
        
        if (!userIsGroupMember) {
            return res.status(403).json({
                success: false,
                error: "Access denied. You must be a member of this group to view updates."
            });
        }

        // Get latest active updates for this group's carousel
        const updates = await Updates.find({
            groupId: groupId,
            isActive: true,
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        })
        .populate('createdBy', 'firstName lastName email')
        .sort({ priority: -1, createdAt: -1 })
        .limit(parseInt(limit));
        
        res.json({
            success: true,
            updates
        });

    } catch (error) {
        console.error("Error fetching latest updates:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

// Update an existing update (Group Admin only)
export const updateUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, link, priority, isActive, expiresAt } = req.body;
        const userId = req.userId;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid update ID"
            });
        }

        // Find the update first to get groupId
        const existingUpdate = await Updates.findById(id);
        if (!existingUpdate) {
            return res.status(404).json({
                success: false,
                error: "Update not found"
            });
        }

        // Check if user is group admin
        const userIsGroupAdmin = await isGroupAdmin(userId, existingUpdate.groupId);
        if (!userIsGroupAdmin) {
            return res.status(403).json({
                success: false,
                error: "Access denied. Group admin privileges required."
            });
        }

        // Find and update
        const updateData = {};
        if (title !== undefined) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description ? description.trim() : null;
        if (link !== undefined) updateData.link = link ? link.trim() : null;
        if (priority !== undefined) updateData.priority = priority;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;

        const updatedUpdate = await Updates.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('createdBy', 'firstName lastName email');

        // Emit real-time update to group members
        emitUpdateUpdated(updatedUpdate);

        res.json({
            success: true,
            message: "Update updated successfully",
            update: updatedUpdate
        });

    } catch (error) {
        console.error("Error updating update:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

// Delete an update (Group Admin only)
export const deleteUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid update ID"
            });
        }

        // Find the update first to get groupId
        const existingUpdate = await Updates.findById(id);
        if (!existingUpdate) {
            return res.status(404).json({
                success: false,
                error: "Update not found"
            });
        }

        // Check if user is group admin
        const userIsGroupAdmin = await isGroupAdmin(userId, existingUpdate.groupId);
        if (!userIsGroupAdmin) {
            return res.status(403).json({
                success: false,
                error: "Access denied. Group admin privileges required."
            });
        }

        // Soft delete by setting isActive to false
        const deletedUpdate = await Updates.findByIdAndUpdate(
            id,
            { isActive: false },
            { new: true }
        );

        // Emit real-time update to group members
        emitUpdateDeleted(id, existingUpdate.groupId);

        res.json({
            success: true,
            message: "Update deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting update:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

// Get update by ID (Group members only)
export const getUpdateById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid update ID"
            });
        }

        const update = await Updates.findOne({
            _id: id,
            isActive: true,
            $or: [
                { expiresAt: null },
                { expiresAt: { $gt: new Date() } }
            ]
        }).populate('createdBy', 'firstName lastName email');

        if (!update) {
            return res.status(404).json({
                success: false,
                error: "Update not found"
            });
        }

        // Check if user is group member
        const userIsGroupMember = await isGroupMember(userId, update.groupId);
        if (!userIsGroupMember) {
            return res.status(403).json({
                success: false,
                error: "Access denied. You must be a member of this group to view updates."
            });
        }

        res.json({
            success: true,
            update
        });

    } catch (error) {
        console.error("Error fetching update:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};

// Check if user is group admin (for frontend)
export const checkGroupAdmin = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.userId;

        if (!groupId) {
            return res.status(400).json({
                success: false,
                error: "Group ID is required"
            });
        }

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: "User not authenticated"
            });
        }

        const userIsGroupAdmin = await isGroupAdmin(userId, groupId);
        
        res.json({
            isAdmin: userIsGroupAdmin
        });

    } catch (error) {
        console.error("Error checking group admin status:", error);
        res.status(500).json({
            success: false,
            error: "Internal server error"
        });
    }
};




