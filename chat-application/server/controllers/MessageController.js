import Message from "../models/MessagesModel.js";
import User from "../models/UserModel.js";
import {mkdirSync, existsSync, renameSync} from "fs";

export const getMessages = async (req, res, next) => {
  try {
    const { recipientId } = req.params;
    const userId = req.userId;

    if (!recipientId || !userId) {
      return res.status(400).send("Recipient ID and User ID are required.");
    }

    const messages = await Message.find({
      $or: [
        { sender: userId, recipient: recipientId },
        { sender: recipientId, recipient: userId },
      ],
    }).sort({ timestamp: 1 });

    return res.status(200).json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const uploadFile = async (request, response, next) => {
  try {
    if (!request.file) {
      return response.status(400).send("No file uploaded.");
    }
    const date = Date.now();
    let fileDir = `uploads/files/${date}`;
    let fileName = `${fileDir}/${request.file.originalname}`;

    mkdirSync(fileDir, { recursive: true });

    renameSync(request.file.path, fileName);

    // Only return the relative path for frontend use
    const relativePath = `files/${date}/${request.file.originalname}`;
    return response.status(200).json({ filePath: relativePath });
  } catch (error) {
    console.log("Error fetching messages:", error);
    return response.status(500).send("Internal Server Error");
  }
};

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(400).send("User ID is required.");
    }

    // Get all messages where the current user is either sender or recipient
    const messages = await Message.find({
      $or: [
        { sender: userId },
        { recipient: userId },
      ],
    }).populate("sender", "firstName lastName image color lastSeen")
      .populate("recipient", "firstName lastName image color lastSeen")
      .sort({ timestamp: -1 });

    // Group messages by conversation (other user)
    const conversations = new Map();

    messages.forEach(message => {
      // Determine the other user in the conversation
      const otherUser = message.sender._id.toString() === userId 
        ? message.recipient 
        : message.sender;

      if (!otherUser) return; // Skip if no recipient (group messages)

      const otherUserId = otherUser._id.toString();

      if (!conversations.has(otherUserId)) {
        conversations.set(otherUserId, {
          _id: otherUser._id,
          firstName: otherUser.firstName,
          lastName: otherUser.lastName,
          image: otherUser.image,
          color: otherUser.color,
          lastSeen: otherUser.lastSeen,
          lastMessageText: message.content,
          lastMessageAt: message.timestamp,
          lastMessageType: message.messageType,
        });
      } else {
        // Update with more recent message if this message is newer
        const existing = conversations.get(otherUserId);
        if (message.timestamp > existing.lastMessageAt) {
          existing.lastMessageText = message.content;
          existing.lastMessageAt = message.timestamp;
          existing.lastMessageType = message.messageType;
        }
      }
    });

    const conversationsList = Array.from(conversations.values());

    return res.status(200).json({ conversations: conversationsList });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const markMessagesAsRead = async (req, res, next) => {
  try {
    const { senderId, recipientId } = req.body;
    if (!senderId || !recipientId) {
      return res.status(400).send("Sender ID and Recipient ID are required.");
    }
    // Mark all messages from sender to recipient as read
    const result = await Message.updateMany(
      { sender: senderId, recipient: recipientId, read: false },
      { $set: { read: true } }
    );
    // Return the updated message IDs
    const updatedMessages = await Message.find({ sender: senderId, recipient: recipientId, read: true }, '_id');
    return res.status(200).json({ updatedMessageIds: updatedMessages.map(m => m._id) });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return res.status(500).send("Internal Server Error");
  }
};
