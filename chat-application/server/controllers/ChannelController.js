import Channel from "../models/ChannelModel.js";
import User from "../models/UserModel.js";
import mongoose from "mongoose";
import multer from "multer";
import { existsSync, mkdirSync, renameSync, unlinkSync } from "fs";
import path from "path";

 export const createChannel = async (request, response, next) => {
    try{
     const { name, members } = request.body;
     const userId = request.userId;

     const admin = await User.findById(userId);

     if (!admin) {
            return response.status(404).send("Admin not found");
        }

        const validMembers = await User.find({
            _id: { $in: members }
        });

        if (validMembers.length !== members.length) {
            return response.status(400).send("some members are not valid users.");
        }

        const uniqueMembers = Array.from(new Set([userId.toString(), ...members.map(String)])).map(id => id);
        const newChannel = new Channel({
            name,
            adminId: userId,
            members: uniqueMembers,
            createdBy: userId,
        });

        await newChannel.save();
        return response.status(201).json({ success: true, channel : newChannel });
  } catch(error) {
        console.log({ error });
        return response.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

 export const getUserChannels = async (request, response, next) => {
    try{
      const userId = request.userId;
      const channels = await Channel.find({
         $or :[{createdBy: userId}, {members: userId}],
      }).sort({ updatedAt: -1 });
  
        return response.status(200).json({ success: true, channels });
  } catch(error) {
        console.log({ error });
        return response.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

export const getChannelMessages = async (request, response, next) => {
    try{
        const { channelId } = request.params;
        const channel = await Channel.findById(channelId).populate({
            path:'messages',
            populate: { 
                path: 'sender', 
                select: 'firstName lastName email _id image color',
             },
        });
      if(!channel) {
            return response.status(404).json({ success: false, error: "Channel not found"});
        }
        const messages = channel.messages;
        return response.status(200).json({ success: true, messages });
  } catch(error) {
        console.log({ error });
        return response.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

// Multer storage for channel pictures
const uploadDir = path.join("uploads", "channels");
if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const date = Date.now();
    cb(null, `${date}_${file.originalname}`);
  },
});
function imageFilter(req, file, cb) {
  const ok = /\.(png|jpg|jpeg|webp|svg)$/i.test(file.originalname);
  cb(ok ? null : new Error('Invalid image format'), ok);
}
export const channelUpload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

export const updateChannelPicture = async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.userId;
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ success: false, error: "Channel not found" });
    // Backward compatibility: if adminId missing, treat createdBy as admin and persist
    if (!channel.adminId && channel.createdBy) {
      channel.adminId = channel.createdBy;
      await channel.save();
    }
    if (String(channel.adminId) !== String(userId)) return res.status(403).json({ success: false, error: "Only admin can update picture" });

    if (!req.file) return res.status(400).json({ success: false, error: "Image file is required" });
    const targetRel = `channels/${req.file.filename}`;

    // delete previous if exists
    if (channel.profilePicture) {
      const oldAbs = path.join("uploads", channel.profilePicture);
      if (existsSync(oldAbs)) {
        try { unlinkSync(oldAbs); } catch { /* ignore */ }
      }
    }

    channel.profilePicture = targetRel;
    await channel.save();
    return res.status(200).json({ success: true, channelId, profilePicture: channel.profilePicture });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

export const addChannelMembers = async (req, res) => {
  try {
    const { channelId } = req.params;
    const requesterId = req.userId;
    // Validate channelId
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({ success: false, error: "Invalid channelId" });
    }

    // Accept both { userId } or { memberIds: [id] }
    const bodyUserId = req.body?.userId;
    const arrayUserId = Array.isArray(req.body?.memberIds) && req.body.memberIds.length > 0 ? req.body.memberIds[0] : undefined;
    const userIdToAdd = bodyUserId || arrayUserId;

    if (!userIdToAdd || !mongoose.Types.ObjectId.isValid(userIdToAdd)) {
      return res.status(400).json({ success: false, error: "Invalid or missing userId" });
    }

    // Load channel
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ success: false, error: "Channel not found" });
    // Backward compatibility: if adminId missing, treat createdBy as admin and persist
    if (!channel.adminId && channel.createdBy) {
      channel.adminId = channel.createdBy;
      await channel.save();
    }
    if (String(channel.adminId) !== String(requesterId)) {
      return res.status(403).json({ success: false, error: "Only admin can add members" });
    }

    // Validate user exists
    const addedUser = await User.findById(userIdToAdd).select("_id firstName lastName email image");
    if (!addedUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    // If already member, return success but indicate no-op
    if (channel.members.map(String).includes(String(userIdToAdd))) {
      return res.status(200).json({ success: true, channelId, user: addedUser, members: channel.members, alreadyMember: true });
    }

    // Add to members using $addToSet
    const updated = await Channel.findByIdAndUpdate(
      channelId,
      { $addToSet: { members: userIdToAdd } },
      { new: true }
    ).select("_id members adminId profilePicture name");

    return res.status(200).json({ success: true, channelId, user: addedUser, members: updated.members });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};