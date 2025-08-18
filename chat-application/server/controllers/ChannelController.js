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
    // Store only the filename in the DB for consistency
    const filename = req.file.filename;
    const targetRel = `channels/${filename}`;

    // delete previous if exists
    if (channel.profilePicture) {
      const oldAbs = path.join("uploads", "channels", channel.profilePicture);
      if (existsSync(oldAbs)) {
        try { unlinkSync(oldAbs); } catch { /* ignore */ }
      }
    }

    // Persist only the filename; clients will prefix with /channels
    channel.profilePicture = filename;
    await channel.save();
    // Append cache-busting timestamp so clients refresh cached image
    const cacheBuster = Date.now();
    // Fire realtime event to all subscribers
    try {
      const { emitChannelPictureUpdated } = await import("../socket.js");
      emitChannelPictureUpdated?.({ channelId, profilePicture: channel.profilePicture, updatedAt: cacheBuster });
    } catch {}
    return res.status(200).json({ success: true, channelId, profilePicture: channel.profilePicture, updatedAt: cacheBuster });
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
    // notify listeners
    try {
      const { emitChannelMembersUpdate } = await import("../socket.js");
      emitChannelMembersUpdate?.({ channelId, members: updated.members.map(String) });
    } catch {}

    return res.status(200).json({ success: true, channelId, user: addedUser, members: updated.members });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

export const getChannelInfo = async (req, res) => {
  try {
    const { channelId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({ success: false, error: "Invalid channelId" });
    }
    const ch = await Channel.findById(channelId).select("name description adminId createdBy members profilePicture");
    if (!ch) return res.status(404).json({ success: false, error: "Channel not found" });
    const pictureUrl = ch.profilePicture ? `channels/${ch.profilePicture}` : null;
    const ensureIds = Array.from(new Set([
      ...(Array.isArray(ch.members) ? ch.members.map((m) => String(m && m._id ? m._id : m)) : []),
      String(ch.adminId || ""),
      String(ch.createdBy || ""),
    ].filter(Boolean)));
    const users = await User.find({ _id: { $in: ensureIds } }).select("_id firstName lastName email image");
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    let members = ensureIds.map((id) => {
      const u = userMap.get(id);
      if (!u) return { id, username: "Unknown", profilePic: null, isAdmin: String(ch.adminId) === String(id) };
      const username = (u.firstName && u.lastName) ? `${u.firstName} ${u.lastName}` : (u.firstName || u.lastName || u.email);
      return { id: String(u._id), username, profilePic: u.image || null, isAdmin: String(ch.adminId) === String(u._id) };
    });
    // Fallback: if we somehow built an empty array, try populate-based read
    if (!members.length) {
      const populated = await Channel.findById(channelId).populate("members", "_id firstName lastName email image").select("adminId members");
      if (populated && Array.isArray(populated.members)) {
        members = populated.members.map((m) => ({
          id: String(m._id),
          username: (m.firstName && m.lastName) ? `${m.firstName} ${m.lastName}` : (m.firstName || m.lastName || m.email),
          profilePic: m.image || null,
          isAdmin: String(populated.adminId) === String(m._id),
        }));
      }
    }
    return res.status(200).json({
      success: true,
      id: String(ch._id),
      name: ch.name,
      description: ch.description || "",
      pictureUrl,
      members,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

export const updateChannelDescription = async (req, res) => {
  try {
    const { channelId } = req.params;
    const { description } = req.body || {};
    const userId = req.userId;
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({ success: false, error: "Invalid channelId" });
    }
    const ch = await Channel.findById(channelId);
    if (!ch) return res.status(404).json({ success: false, error: "Channel not found" });
    const adminId = ch.adminId || ch.createdBy;
    if (String(adminId) !== String(userId)) {
      return res.status(403).json({ success: false, error: "Only admin can update description" });
    }
    ch.description = description || "";
    await ch.save();
    // notify listeners
    try {
      const { emitChannelUpdate } = await import("../socket.js");
      emitChannelUpdate?.({ channelId, description: ch.description });
    } catch {}
    return res.status(200).json({ success: true, description: ch.description });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};