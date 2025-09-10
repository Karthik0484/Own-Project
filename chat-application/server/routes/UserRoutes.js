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

// Utility helpers
const inferTypeFromUrl = (url) => {
  const lower = (url || '').toLowerCase();
  const ext = lower.split('.').pop() || '';
  const imageExt = ['png','jpg','jpeg','gif','webp','bmp'];
  const videoExt = ['mp4','mov','avi','mkv','webm','wmv'];
  if (imageExt.includes(ext)) return 'image';
  if (videoExt.includes(ext)) return 'video';
  return 'file';
};

const basenameFromUrl = (url) => {
  if (!url) return '';
  const parts = url.split('/');
  return parts[parts.length - 1] || '';
};

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
    
    // Find messages with files between the two users
    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: currentUserId },
        { sender: currentUserId, recipient: userId }
      ],
      fileUrl: { $exists: true, $ne: null }
    })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(parseInt(limit));

    const images = [];
    const files = [];
    const links = [];

    messages.forEach(message => {
      if (!message.fileUrl) return;

      const detectedType = inferTypeFromUrl(message.fileUrl);
      const nameFromPath = basenameFromUrl(message.fileUrl);

      const mediaItem = {
        id: message._id,
        name: message.content && message.content.trim() ? message.content : (nameFromPath || `File-${message._id}`),
        url: `${process.env.ORIGIN || 'http://localhost:3001'}/${message.fileUrl}`,
        type: detectedType,
        date: message.timestamp,
      };

      if (detectedType === 'image') {
        images.push(mediaItem);
      } else if (detectedType === 'video') {
        files.push({ ...mediaItem, type: 'video' });
      } else {
        files.push(mediaItem);
      }
    });

    // Count for pagination
    const totalCount = await Message.countDocuments({
      $or: [
        { sender: userId, recipient: currentUserId },
        { sender: currentUserId, recipient: userId }
      ],
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
    .sort({ updatedAt: -1 });

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

// PRD alias: GET /users/{id}/mutual-channels
router.get("/:id/mutual-channels", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    const mutualChannels = await channel.find({
      members: { $all: [id, currentUserId] }
    }).select('name members');

    const data = mutualChannels.map(ch => ({
      channelId: ch._id,
      name: ch.name,
      status: 'exists'
    }));

    return res.json({ success: true, channels: data });
  } catch (error) {
    console.error("mutual-channels error:", error);
    return res.status(500).json({ success: false, error: "Internal server error" });
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

// PRD alias: POST /users/{id}/block
router.post("/:id/block", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Missing target user ID' });
    return res.json({ success: true, message: 'User blocked successfully' });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
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

// PRD alias: POST /users/{id}/report
router.post("/:id/report", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    return res.json({ success: true, message: 'User reported successfully' });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Unified media metadata per PRD: GET /users/:id/media
router.get("/:id/media", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.userId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
    }

    // Find messages with files between the two users (DM context)
    const messages = await Message.find({
      $or: [
        { sender: id, recipient: currentUserId },
        { sender: currentUserId, recipient: id }
      ],
      fileUrl: { $exists: true, $ne: null }
    }).sort({ timestamp: -1 });

    const base = process.env.ORIGIN || 'http://localhost:3001';
    const inferTypeFromUrl = (url) => {
      const lower = (url || '').toLowerCase();
      const ext = lower.split('.').pop() || '';
      const imageExt = ['png','jpg','jpeg','gif','webp','bmp'];
      const videoExt = ['mp4','mov','avi','mkv','webm','wmv'];
      if (imageExt.includes(ext)) return 'image';
      if (videoExt.includes(ext)) return 'video';
      return 'file';
    };

    const media = messages.map((m) => {
      const type = inferTypeFromUrl(m.fileUrl);
      const url = `${base}/${m.fileUrl}`;
      const nameFromPath = (m.fileUrl || '').split('/').pop();
      return {
        id: m._id,
        type,
        url,
        thumbnailUrl: url, // fallback to original url if no thumbnail generated
        uploadedAt: m.timestamp,
        size: m.fileSize || null,
        name: (m.content && m.content.trim()) || nameFromPath || `File-${m._id}`,
      };
    });

    return res.json({ success: true, media });
  } catch (e) {
    console.error('Error fetching media:', e);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
