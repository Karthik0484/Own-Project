import { Server } from "socket.io";
import Message from "./models/MessagesModel.js";
import User from "./models/UserModel.js";
import channel from "./models/ChannelModel.js";

const allowedOrigins = [
  process.env.ORIGIN,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://chat-app-frontend-gray-zeta.vercel.app",
  "https://chat-app-frontend.vercel.app",
].filter(Boolean);

let ioRef = null;

// moved below setupSocket to top-level scope

export default function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
    },
    path: "/socket.io",
  });
  ioRef = io;

 const userSocketMap = new Map();

 const disconnect = (socket) => {
    console.log(`Client Disconnected: ${socket.id}`);
    for(const [userId,socketId] of userSocketMap.entries()) {
        if (socketId === socket.id){
            userSocketMap.delete(userId);
            // Update lastSeen when user disconnects
            User.findByIdAndUpdate(userId, { lastSeen: new Date() }).catch(console.error);
            break;
        }
    }
 };

 const sendMessage = async ( message ) => {
    console.log("sendMessage function called with:", message);
    
    try {
        const senderSocketId = userSocketMap.get(message.sender);
        const recipientSocketId = userSocketMap.get(message.recipient);
        
        console.log("Sender socket ID:", senderSocketId);
        console.log("Recipient socket ID:", recipientSocketId);
        console.log("User socket map:", userSocketMap);

        // Update sender's lastSeen
        await User.findByIdAndUpdate(message.sender, { lastSeen: new Date() });

        console.log("Creating message in database...");
        const createdMessage = await Message.create({ ...message, status: "sent" });
        console.log("Message created successfully:", createdMessage);

        console.log("Populating message data...");
        const messageData = await Message.findById(createdMessage._id)
        .populate("sender","id email firstName lastName image color lastSeen")
        .populate("recipient","id email firstName lastName image color lastSeen");
        console.log("Message data populated:", messageData);

        if (recipientSocketId) {
            console.log("Emitting to recipient:", recipientSocketId);
            io.to(recipientSocketId).emit("recieveMessage", messageData);
            // Immediately update status to delivered if recipient is online
            await Message.findByIdAndUpdate(createdMessage._id, { status: "delivered" });
            const senderSock = senderSocketId;
            if (senderSock) {
              io.to(senderSock).emit("message_status_update", { messageId: createdMessage._id, status: "delivered" });
            }
        }
        if (senderSocketId){
            console.log("Emitting to sender:", senderSocketId);
            io.to(senderSocketId).emit("recieveMessage", messageData);
            // Notify sender that message is sent
            io.to(senderSocketId).emit("message_status_update", { messageId: createdMessage._id, status: "sent" });
        }
    } catch (error) {
        console.error("Error in sendMessage:", error);
    }
 };

 const sendChannelMessage = async (message) => {
    const { channelId, sender, content, messageType, fileUrl } = message;

    const createdMessage = await Message.create({
        sender,
        recipient: null,
        content,
        channelId,
        timestamp: new Date(),
        messageType,
        fileUrl,
    });

    const messageData = await Message.findById(createdMessage._id)
        .populate("sender", "id email firstName lastName image color lastSeen")
        .exec();

    await channel.findByIdAndUpdate(channelId, {
        $push: { messages: messageData._id },
    });

    const channelDoc = await channel.findById(channelId)
        .populate("members");

    const finalData = {
        ...messageData._doc,
        channelId: channelDoc._id
    };

    if (channelDoc && channelDoc._id) {
        io.to(channelDoc._id.toString()).emit("receive-channel-message", finalData);
    }
  };

  io.on("connection", (socket) => {
    console.log("New socket connection:", socket.id);
    const userId = socket.handshake.query.userId;
    console.log("User ID from query:", userId);

    if (userId) {
        userSocketMap.set(userId, socket.id);
        // Set user online and update lastSeen
        User.findByIdAndUpdate(userId, { online: true, lastSeen: new Date() }).catch(console.error);
        io.emit("userOnline", { userId });

        // When a recipient comes online, mark pending 'sent' messages as 'delivered'
        (async () => {
          try {
            const pending = await Message.find({ recipient: userId, status: "sent" }).select("_id sender");
            if (pending && pending.length) {
              const ids = pending.map((m) => m._id);
              await Message.updateMany({ _id: { $in: ids } }, { $set: { status: "delivered" } });
              // Notify online senders in real-time
              for (const m of pending) {
                const senderId = String(m.sender);
                const senderSock = userSocketMap.get(senderId);
                if (senderSock) {
                  io.to(senderSock).emit("message_status_update", { messageId: m._id, status: "delivered" });
                }
              }
            }
          } catch (err) {
            console.error("Error marking pending messages as delivered on connect:", err);
          }
        })();

        // Heartbeat for lastSeen
        const heartbeat = setInterval(async () => {
            try {
                await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
            } catch (error) {
                console.error("Error updating heartbeat:", error);
            }
        }, 30000);

        socket.on("disconnect", () => {
            clearInterval(heartbeat);
            userSocketMap.delete(userId);
            User.findByIdAndUpdate(userId, { online: false, lastSeen: new Date() }).catch(console.error);
            io.emit("userOffline", { userId });
        });
    } else {
        console.log("User ID not provided during connection.");
    }

    socket.on("sendMessage", (data) => {
        sendMessage(data);
    });
    
    socket.on("send-channel-message", sendChannelMessage);

    // channel metadata updates
    socket.on("channel:update", ({ channelId, description, pictureUrl, name }) => {
      const payload = { channelId };
      if (description !== undefined) payload.description = description;
      if (pictureUrl !== undefined) payload.pictureUrl = pictureUrl;
      if (name !== undefined) payload.name = name;
      io.to(String(channelId)).emit("channel:update", payload);
    });

    socket.on("channel:members:update", ({ channelId, members }) => {
      io.to(String(channelId)).emit("channel:members:update", { channelId, members });
    });

    // real-time: channel picture updated (include cache-busting timestamp)
    socket.on("channel-picture-updated", ({ channelId, profilePicture, updatedAt }) => {
      const payload = { channelId, profilePicture };
      if (updatedAt) payload.updatedAt = updatedAt;
      io.to(channelId).emit("channel-picture-updated", payload);
    });

    // real-time: channel members added
    socket.on("channel-members-added", ({ channelId, members }) => {
      io.to(channelId).emit("channel-members-added", { channelId, members });
    });

    socket.on("typing", (data) => {
        const { recipient, isTyping } = data;
        const recipientSocketId = userSocketMap.get(recipient);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit("userTyping", {
                sender: userId,
                isTyping: isTyping
            });
        }
    });

    socket.on("readMessages", async (data) => {
        const { senderId, recipientId } = data;
        // Mark all messages from sender to recipient as read
        await Message.updateMany(
            { sender: senderId, recipient: recipientId, read: false },
            { $set: { read: true, status: "read" } }
        );
        // Find all read message IDs
        const updatedMessages = await Message.find({ sender: senderId, recipient: recipientId, read: true }, '_id');
        // Notify sender in real time
        const senderSocketId = userSocketMap.get(senderId);
        if (senderSocketId) {
            io.to(senderSocketId).emit("messagesRead", {
                recipientId,
                messageIds: updatedMessages.map(m => m._id)
            });
            // Also emit unified message_status_update for UI consistency
            updatedMessages.forEach(({ _id }) => {
              io.to(senderSocketId).emit("message_status_update", { messageId: _id, status: "read" });
            });
        }
    });

    socket.on("join-channel", (channelId) => {
        if (channelId) {
            socket.join(channelId);
            console.log(`Socket ${socket.id} joined channel room ${channelId}`);
        }
    });
  });
}

export function emitChannelPictureUpdated({ channelId, profilePicture, updatedAt }) {
  if (!ioRef) return;
  const payload = { channelId, profilePicture };
  if (updatedAt) payload.updatedAt = updatedAt;
  ioRef.to(String(channelId)).emit("channel-picture-updated", payload);
}

export function emitChannelUpdate({ channelId, description, pictureUrl, name }) {
  if (!ioRef) return;
  const payload = { channelId };
  if (description !== undefined) payload.description = description;
  if (pictureUrl !== undefined) payload.pictureUrl = pictureUrl;
  if (name !== undefined) payload.name = name;
  ioRef.to(String(channelId)).emit("channel:update", payload);
}

export function emitChannelMembersUpdate({ channelId, members }) {
  if (!ioRef) return;
  ioRef.to(String(channelId)).emit("channel:members:update", { channelId, members });
}