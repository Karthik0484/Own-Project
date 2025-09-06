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
    console.log("getConversations - userId:", userId);

    if (!userId) {
      console.log("getConversations - No userId found");
      return res.status(400).json({ error: "User ID is required." });
    }

    console.log("getConversations - Fetching messages for userId:", userId);
    
    // Get all messages where the current user is either sender or recipient
    let messages;
    try {
      messages = await Message.find({
        $or: [
          { sender: userId },
          { recipient: userId },
        ],
      }).populate("sender", "firstName lastName image color lastSeen")
        .populate("recipient", "firstName lastName image color lastSeen")
        .sort({ timestamp: -1 })
        .lean(); // Use lean() for better performance
    } catch (dbError) {
      console.error("getConversations - Database error:", dbError);
      return res.status(500).json({ 
        error: "Database error", 
        message: "Failed to fetch messages from database" 
      });
    }

    console.log("getConversations - Found messages:", messages ? messages.length : 0);

    // If no messages found, return empty array
    if (!messages || messages.length === 0) {
      console.log("getConversations - No messages found, returning empty conversations");
      return res.status(200).json({ conversations: [] });
    }

    // Group messages by conversation (other user)
    const conversations = new Map();

    messages.forEach((message, index) => {
      try {
        // Check if message has required fields
        if (!message.sender || !message.sender._id) {
          console.log(`getConversations - Message ${index} missing sender:`, message);
          return;
        }

        // Determine the other user in the conversation
        const otherUser = message.sender._id.toString() === userId 
          ? message.recipient 
          : message.sender;

        if (!otherUser || !otherUser._id) {
          console.log(`getConversations - Message ${index} missing otherUser:`, message);
          return; // Skip if no recipient (group messages)
        }

        const otherUserId = otherUser._id.toString();

        if (!conversations.has(otherUserId)) {
          conversations.set(otherUserId, {
            _id: otherUser._id,
            firstName: otherUser.firstName || '',
            lastName: otherUser.lastName || '',
            image: otherUser.image || '',
            color: otherUser.color || '',
            lastSeen: otherUser.lastSeen || new Date(),
            lastMessageText: message.content || '',
            lastMessageAt: message.timestamp || new Date(),
            lastMessageType: message.messageType || 'text',
          });
        } else {
          // Update with more recent message if this message is newer
          const existing = conversations.get(otherUserId);
          if (message.timestamp > existing.lastMessageAt) {
            existing.lastMessageText = message.content || '';
            existing.lastMessageAt = message.timestamp || new Date();
            existing.lastMessageType = message.messageType || 'text';
          }
        }
      } catch (messageError) {
        console.error(`getConversations - Error processing message ${index}:`, messageError, message);
      }
    });

    const conversationsList = Array.from(conversations.values());
    console.log("getConversations - Created conversations list:", conversationsList.length);
    
    // Sort conversations by lastMessageAt timestamp (most recent first)
    const sortedConversations = conversationsList.sort((a, b) => {
      try {
        const timestampA = new Date(a.lastMessageAt).getTime();
        const timestampB = new Date(b.lastMessageAt).getTime();
        return timestampB - timestampA; // Descending order (newest first)
      } catch (sortError) {
        console.error("getConversations - Error sorting conversations:", sortError, { a, b });
        return 0;
      }
    });

    console.log("getConversations - Returning sorted conversations:", sortedConversations.length);
    return res.status(200).json({ conversations: sortedConversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ 
      error: "Internal Server Error", 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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
      { $set: { read: true, status: "read" } }
    );
    // Return the updated message IDs
    const updatedMessages = await Message.find({ sender: senderId, recipient: recipientId, read: true }, '_id');
    return res.status(200).json({ updatedMessageIds: updatedMessages.map(m => m._id) });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return res.status(500).send("Internal Server Error");
  }
};
