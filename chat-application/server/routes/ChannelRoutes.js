import {Router} from 'express';
import { verifyToken } from '../middlewares/AuthMiddleware.js';
import { createChannel } from '../controllers/ChannelController.js';
import { getUserChannels } from '../controllers/ChannelController.js';
import Channel from '../models/ChannelModel.js';

const channelRoutes = Router();

channelRoutes.post("/create-channel", verifyToken, createChannel);
channelRoutes.get("/get-user-channels", verifyToken, getUserChannels);
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