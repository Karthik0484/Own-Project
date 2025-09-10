import {Router} from 'express';
import { verifyToken } from '../middlewares/AuthMiddleware.js';
import { createChannel } from '../controllers/ChannelController.js';
import { getUserChannels } from '../controllers/ChannelController.js';
import { updateChannelPicture, addChannelMembers, channelUpload } from '../controllers/ChannelController.js';
import { removeChannelMember } from '../controllers/ChannelController.js';
import { getChannelInfo, updateChannelDescription } from '../controllers/ChannelController.js';
import Channel from '../models/ChannelModel.js';
import { get } from 'mongoose';
import { getChannelMessages } from '../controllers/ChannelController.js';

const channelRoutes = Router();

channelRoutes.post("/create-channel", verifyToken, createChannel);
channelRoutes.get("/get-user-channels", verifyToken, getUserChannels);
channelRoutes.get("/get-channel-messages/:channelId", verifyToken, getChannelMessages);
channelRoutes.post("/:channelId/update-picture", verifyToken, channelUpload.single("channel-image"), updateChannelPicture);
// Compatibility alias matching spec: POST /api/channels/:channelId/picture
channelRoutes.post("/channels/:channelId/picture", verifyToken, channelUpload.single("channel-image"), updateChannelPicture);
channelRoutes.post("/:channelId/add-members", verifyToken, addChannelMembers);
// Support alternate path ordering just in case clients call /add-members/:channelId
channelRoutes.post("/add-members/:channelId", verifyToken, addChannelMembers);
// Remove member endpoints
channelRoutes.delete("/channels/:channelId/members/:userId", verifyToken, removeChannelMember);
channelRoutes.post("/channels/:channelId/remove-member", verifyToken, removeChannelMember);
channelRoutes.delete("/:channelId/members/:userId", verifyToken, removeChannelMember);
channelRoutes.post("/:channelId/remove-member", verifyToken, removeChannelMember);
// Channel info and description
channelRoutes.get("/channels/:channelId/info", verifyToken, getChannelInfo);
// Also support base-style path so full route can be /api/channel/:channelId/info
channelRoutes.get("/:channelId/info", verifyToken, getChannelInfo);
channelRoutes.patch("/channels/:channelId/description", verifyToken, updateChannelDescription);
// Compatibility alias matching spec: PUT /api/channels/:channelId/description
channelRoutes.put("/channels/:channelId/description", verifyToken, updateChannelDescription);
// And base-style path: /api/channel/:channelId/description
channelRoutes.patch("/:channelId/description", verifyToken, updateChannelDescription);
channelRoutes.put("/:channelId/description", verifyToken, updateChannelDescription);

// Access check endpoint
channelRoutes.get("/:channelId/access", verifyToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.userId;
    const ch = await Channel.findById(channelId).select('members');
    if (!ch) return res.status(404).json({ success: false, error: 'Channel not found' });
    const hasAccess = ch.members.some(m => m.toString() === userId);
    if (!hasAccess) return res.status(403).json({ success: false, error: 'Forbidden' });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});
// Alias path per some clients: /channels/:channelId/access
channelRoutes.get("/channels/:channelId/access", verifyToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.userId;
    const ch = await Channel.findById(channelId).select('members');
    if (!ch) return res.status(404).json({ success: false, error: 'Channel not found' });
    const hasAccess = ch.members.some(m => m.toString() === userId);
    if (!hasAccess) return res.status(403).json({ success: false, error: 'Forbidden' });
    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Compatibility: GET /api/channel/:channelId returns channel details
channelRoutes.get("/:channelId", verifyToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const ch = await Channel.findById(channelId).populate('members', 'firstName lastName image email');
    if (!ch) return res.status(404).json({ error: 'Channel not found or deleted.' });
    return res.json({
      channelId: ch._id,
      name: ch.name,
      status: 'active',
      members: ch.members || [],
      description: ch.description || '',
      profilePicture: ch.profilePicture || null,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

channelRoutes.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const channels = await Channel.find({
      $or: [
        { members: userId },
        { createdBy: userId }
      ]
    });
    res.json(channels);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

export default channelRoutes;