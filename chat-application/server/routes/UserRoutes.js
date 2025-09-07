import { Router } from "express";
import { verifyToken } from "../middlewares/AuthMiddleware.js";
import User from "../models/UserModel.js";
import Message from "../models/MessagesModel.js";
import channel from "../models/ChannelModel.js";
import mongoose from "mongoose";

const router = Router();

// Get user profile by ID
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;
    
    // Validate ID format
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid user ID" 
      });
    }
    
    // Check if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid user ID format" 
      });
    }
    
    // Find user by ID
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    // Format user data according to the required structure
    const userData = {
      id: user._id,
      username: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      lastSeen: user.lastSeen,
      profileImage: user.image ? `${process.env.ORIGIN || 'http://localhost:3001'}/${user.image}` : null,
      bio: user.bio || "No bio available",
      online: user.online,
      createdAt: user.createdAt,
      color: user.color,
      // Add additional fields for better UX
      customStatus: user.customStatus || null,
      phone: user.phone || null
    };

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    
    // Handle specific MongoDB errors
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid user ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: "Internal server error" 
    });
  }
});

// Get user profile (alternative endpoint for compatibility)
router.get("/:id/profile", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find user by ID
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    // Format user data according to the required structure
    const userData = {
      id: user._id,
      username: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      lastSeen: user.lastSeen,
      profileImage: user.image ? `${process.env.ORIGIN || ''}/${user.image}` : null,
      bio: user.bio || "No bio available",
      online: user.online,
      createdAt: user.createdAt,
      color: user.color
    };

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ 
      success: false, 
      error: "Internal server error" 
    });
  }
});

// Get shared media between users
router.get("/messages/shared-media", verifyToken, async (req, res) => {
  try {
    const { userId, currentUserId, page = 1, limit = 10 } = req.query;
    
    if (!userId || !currentUserId) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters"
      });
    }

    const skip = (page - 1) * limit;
    
    // Find messages with media between the two users
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: currentUserId },
        { sender: currentUserId, recipient: userId }
      ],
      messageType: { $in: ['image', 'file', 'link'] },
      fileUrl: { $exists: true, $ne: null } // Ensure fileUrl exists
    })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate('sender', 'firstName lastName image');

    // Categorize media
    const images = [];
    const files = [];
    const links = [];

    messages.forEach(message => {
      if (!message.fileUrl) return; // Skip messages without fileUrl
      
      const mediaItem = {
        id: message._id,
        name: message.content || 'Untitled',
        url: message.fileUrl,
        type: message.messageType,
        date: message.timestamp,
        sender: message.sender,
        size: message.fileSize || 'Unknown'
      };

      switch (message.messageType) {
        case 'image':
          images.push(mediaItem);
          break;
        case 'file':
          files.push(mediaItem);
          break;
        case 'link':
          links.push(mediaItem);
          break;
      }
    });

    // Check if there are more results
    const totalCount = await Message.countDocuments({
      $or: [
        { sender: userId, recipient: currentUserId },
        { sender: currentUserId, recipient: userId }
      ],
      messageType: { $in: ['image', 'file', 'link'] },
      fileUrl: { $exists: true, $ne: null }
    });

    const hasMore = (skip + messages.length) < totalCount;

    res.json({
      success: true,
      images,
      files,
      links,
      hasMore,
      total: totalCount
    });
  } catch (error) {
    console.error("Error fetching shared media:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// Get mutual channels between users
router.get("/channels/mutual", verifyToken, async (req, res) => {
  try {
    const { userId, currentUserId } = req.query;
    
    if (!userId || !currentUserId) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters"
      });
    }

    // Find channels where both users are members
    const mutualChannels = await channel.find({
      members: { $all: [userId, currentUserId] }
    })
    .select('name profilePicture members description')
    .populate('members', 'firstName lastName image')
    .sort({ updatedAt: -1 }); // Sort by most recent activity

    const formattedChannels = mutualChannels.map(ch => ({
      id: ch._id,
      name: ch.name,
      members: ch.members.length,
      profilePicture: ch.profilePicture ? `${process.env.ORIGIN || 'http://localhost:3001'}/channels/${ch.profilePicture}` : null,
      description: ch.description || 'No description available'
    }));

    res.json({
      success: true,
      channels: formattedChannels,
      count: formattedChannels.length
    });
  } catch (error) {
    console.error("Error fetching mutual channels:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// Get mute status for a user
router.get("/mute-status", verifyToken, async (req, res) => {
  try {
    const { targetUserId } = req.query;
    const currentUserId = req.userId;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: "Missing target user ID"
      });
    }

    // For now, return false as mute status is not implemented in the current schema
    // This can be extended when mute functionality is added to the user model
    res.json({
      success: true,
      isMuted: false
    });
  } catch (error) {
    console.error("Error fetching mute status:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// Toggle mute status for a user
router.post("/toggle-mute", verifyToken, async (req, res) => {
  try {
    const { targetUserId, mute } = req.body;
    const currentUserId = req.userId;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: "Missing target user ID"
      });
    }

    // For now, just return success as mute functionality is not fully implemented
    // This can be extended when mute functionality is added to the user model
    res.json({
      success: true,
      isMuted: mute
    });
  } catch (error) {
    console.error("Error toggling mute status:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// Block user
router.post("/block", verifyToken, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.userId;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: "Missing target user ID"
      });
    }

    // For now, just return success as block functionality is not fully implemented
    // This can be extended when block functionality is added to the user model
    res.json({
      success: true,
      message: "User blocked successfully"
    });
  } catch (error) {
    console.error("Error blocking user:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

// Report user
router.post("/report", verifyToken, async (req, res) => {
  try {
    const { targetUserId, reason } = req.body;
    const currentUserId = req.userId;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: "Missing target user ID"
      });
    }

    // For now, just return success as report functionality is not fully implemented
    // This can be extended when report functionality is added to the user model
    res.json({
      success: true,
      message: "User reported successfully"
    });
  } catch (error) {
    console.error("Error reporting user:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
});

export default router;
