import {Router} from 'express';
import { verifyToken } from '../middlewares/AuthMiddleware.js';
import { createChannel } from '../controllers/ChannelController.js';
import { getUserChannels } from '../controllers/ChannelController.js';
import { updateChannelPicture, addChannelMembers, channelUpload } from '../controllers/ChannelController.js';
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