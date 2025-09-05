import { Server } from "socket.io";
import Message from "./models/MessagesModel.js";
import User from "./models/UserModel.js";
import channel from "./models/ChannelModel.js";
import { sendToUsers } from "./push/fcm.js";

const allowedOrigins = [
  process.env.ORIGIN,
  "http://localhost:5173",
  "http://localhost:3000",
  "https://chat-app-frontend-gray-zeta.vercel.app",
  "https://chat-app-frontend.vercel.app",
].filter(Boolean);

let ioRef = null;

// Whiteboard sessions storage
// All coordinates are stored as normalized values (0-1) for resolution independence
const whiteboardSessions = new Map();
const voiceSessions = new Map();

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
    
    // Clean up whiteboard and voice sessions
    cleanupUserSessions(socket.id);
 };

 const cleanupUserSessions = (socketId) => {
   // Remove user from whiteboard sessions
   for (const [chatId, session] of whiteboardSessions.entries()) {
     session.participants = session.participants.filter(p => p.socketId !== socketId);
     if (session.participants.length === 0) {
       whiteboardSessions.delete(chatId);
     } else {
       io.to(chatId).emit('whiteboard:user_left', { socketId });
     }
   }
   
   // Remove user from voice sessions
   for (const [sessionId, session] of voiceSessions.entries()) {
     session.participants = session.participants.filter(p => p.socketId !== socketId);
     if (session.participants.length === 0) {
       voiceSessions.delete(sessionId);
     } else {
       io.to(sessionId).emit('voice:user_left', { socketId });
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
        
        // Push notification for DM (recipient only)
        console.log("🔔 Starting DM push notification process...");
        try {
          const senderId = String(message.sender);
          const recipientId = String(message.recipient);
          const preview = (message.content || '').slice(0, 60) || '📎 Attachment';
          const senderName = `${messageData?.sender?.firstName || ''} ${messageData?.sender?.lastName || ''}`.trim() || 'New message';
          const avatar = messageData?.sender?.image ? `${process.env.ORIGIN || ''}/${messageData.sender.image}` : '';
          
          console.log("📱 DM Push notification details:", {
            senderId,
            recipientId,
            senderName,
            preview,
            avatar,
            content: message.content
          });
          
          await sendToUsers({
            userIds: [recipientId],
            title: `${senderName} • Direct message`,
            body: preview,
            image: avatar,
            url: `/chat/${recipientId}`,
            type: 'dm',
            extra: { chatId: recipientId, senderId, senderName, preview, avatar },
            priority: 'high',
            ttlSec: 3600,
          });
          console.log("✅ DM push notification sent successfully");
        } catch (e) { 
          console.error('❌ Push DM error:', e?.message || e); 
          console.error('❌ Full error:', e);
        }
    } catch (error) {
        console.error("Error in sendMessage:", error);
    }
 };

 const sendChannelMessage = async (message) => {
    console.log("sendChannelMessage function called with:", message);
    
    try {
        const { channelId, sender, content, messageType, fileUrl } = message;

        console.log("Creating channel message in database...");
        const createdMessage = await Message.create({
            sender,
            recipient: null,
            content,
            channelId,
            timestamp: new Date(),
            messageType,
            fileUrl,
        });
        console.log("Channel message created successfully:", createdMessage);

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
        
        // Push notification for channel (all members except sender)
        console.log("🔔 Starting channel push notification process...");
        try {
          const exclude = String(sender);
          const memberIds = (channelDoc?.members || []).map((m) => String(m._id || m)).filter((id) => id !== exclude);
          const preview = (content || '').slice(0, 60) || '📎 Attachment';
          const senderName = `${messageData?.sender?.firstName || ''} ${messageData?.sender?.lastName || ''}`.trim();
          const channelAvatar = channelDoc?.profilePicture ? `${process.env.ORIGIN || ''}/channels/${channelDoc.profilePicture}` : '';
          const senderAvatar = messageData?.sender?.image ? `${process.env.ORIGIN || ''}/${messageData.sender.image}` : '';
          
          console.log("📱 Channel Push notification details:", {
            channelId: String(channelId),
            channelName: channelDoc?.name,
            senderId: String(sender),
            senderName,
            memberIds,
            preview,
            content
          });
          
          await sendToUsers({
            userIds: memberIds,
            title: `${channelDoc?.name || 'Channel'} • ${senderName}`.trim(),
            body: preview,
            image: channelAvatar || senderAvatar,
            url: `/chat/${channelId}`,
            type: 'channel',
            extra: { channelId: String(channelId), senderId: String(sender), senderName, preview, avatar: senderAvatar },
            priority: 'normal',
            ttlSec: 3600,
          });
          console.log("✅ Channel push notification sent successfully");
        } catch (e) { 
          console.error('❌ Push channel error:', e?.message || e); 
          console.error('❌ Full error:', e);
        }
    } catch (error) {
        console.error("Error in sendChannelMessage:", error);
    }
  };

  // Whiteboard event handlers
  const handleWhiteboardJoin = async (socket, data) => {
    const { chatId, chatType, userId, userInfo } = data;
    
    if (!whiteboardSessions.has(chatId)) {
      whiteboardSessions.set(chatId, {
        participants: [],
        canvasHistory: [],
        locked: false,
        adminId: null
      });
    }
    
    const session = whiteboardSessions.get(chatId);
    const participant = {
      socketId: socket.id,
      userId,
      userInfo,
      joinedAt: new Date()
    };
    
    session.participants.push(participant);
    socket.join(chatId);
    
    // Set first user as admin if no admin exists
    if (!session.adminId) {
      session.adminId = userId;
    }
    
    // Send current board state to the joining user
    socket.emit('whiteboard:board_state', {
      chatId,
      canvasState: session.canvasState,
      actions: session.canvasHistory
    });
    
    io.to(chatId).emit('whiteboard:user_joined', {
      participant,
      allParticipants: session.participants,
      isAdmin: session.adminId === userId,
      isLocked: session.locked
    });
    
    console.log(`User ${userId} joined whiteboard session ${chatId}`);
  };

  const handleWhiteboardLeave = async (socket, data) => {
    const { chatId, userId } = data;
    const session = whiteboardSessions.get(chatId);

    if (!session) return;

    session.participants = session.participants.filter(p => p.socketId !== socket.id);
    if (session.participants.length === 0) {
      whiteboardSessions.delete(chatId);
    } else {
      io.to(chatId).emit('whiteboard:user_left', { socketId: socket.id });
    }
    console.log(`User ${userId} left whiteboard session ${chatId}`);
  };

  const handleWhiteboardDraw = (socket, data) => {
    const { chatId, userId, x0, y0, x1, y1, tool, color, brushSize, timestamp } = data;
    const session = whiteboardSessions.get(chatId);
    
    if (!session) return;
    
    // Check if whiteboard is locked and user is not admin
    if (session.locked && session.adminId !== userId) {
      socket.emit('whiteboard:error', { message: 'Whiteboard is locked by admin' });
      return;
    }
    
    // Add to canvas history (coordinates are already normalized from client)
    const drawAction = {
      type: 'draw',
      userId,
      x0, // Already normalized (0-1)
      y0, // Already normalized (0-1)
      x1, // Already normalized (0-1)
      y1, // Already normalized (0-1)
      tool,
      color,
      brushSize,
      timestamp
    };
    
    session.canvasHistory.push(drawAction);
    
    // Keep only last 1000 actions to prevent memory issues
    if (session.canvasHistory.length > 1000) {
      session.canvasHistory = session.canvasHistory.slice(-1000);
    }
    
    // Broadcast drawing action to all participants (coordinates remain normalized)
    socket.to(chatId).emit('whiteboard:draw', {
      userId,
      x0,
      y0,
      x1,
      y1,
      tool,
      color,
      brushSize,
      timestamp
    });
  };

  const handleWhiteboardSnapshot = async (socket, data) => {
    const { chatId, imageData, channelId, userId } = data;
    
    try {
      // Save snapshot as a message in the channel
      const snapshotMessage = await Message.create({
        sender: userId,
        recipient: null,
        content: 'Whiteboard Snapshot',
        channelId,
        timestamp: new Date(),
        messageType: 'whiteboard_snapshot',
        fileUrl: imageData // This would be the base64 image data or file path
      });
      
      // Broadcast snapshot saved event
      io.to(chatId).emit('whiteboard:snapshot_saved', {
        messageId: snapshotMessage._id,
        userId,
        timestamp: Date.now()
      });
      
      console.log(`Whiteboard snapshot saved for session ${chatId}`);
    } catch (error) {
      console.error('Error saving whiteboard snapshot:', error);
      socket.emit('whiteboard:error', { message: 'Failed to save snapshot' });
    }
  };

  const handleWhiteboardShape = (socket, data) => {
    const { chatId, userId, shape, color, brushSize, timestamp } = data;
    const session = whiteboardSessions.get(chatId);
    
    if (!session) return;
    
    // Check if whiteboard is locked and user is not admin
    if (session.locked && session.adminId !== userId) {
      socket.emit('whiteboard:error', { message: 'Whiteboard is locked by admin' });
      return;
    }
    
    // Add to canvas history (shape coordinates are already normalized from client)
    const shapeAction = {
      type: 'shape_drawn',
      userId,
      shape, // Already normalized coordinates
      color,
      brushSize,
      timestamp
    };
    
    session.canvasHistory.push(shapeAction);
    
    // Broadcast shape to all participants (coordinates remain normalized)
    socket.to(chatId).emit('whiteboard:shape_drawn', {
      userId,
      shape,
      color,
      brushSize,
      timestamp
    });
  };

  const handleWhiteboardText = (socket, data) => {
    const { chatId, userId, text, x, y, color, fontSize, timestamp } = data;
    const session = whiteboardSessions.get(chatId);
    
    if (!session) return;
    
    // Check if whiteboard is locked and user is not admin
    if (session.locked && session.adminId !== userId) {
      socket.emit('whiteboard:error', { message: 'Whiteboard is locked by admin' });
      return;
    }
    
    // Add to canvas history (text coordinates are already normalized from client)
    const textAction = {
      type: 'text_added',
      userId,
      text,
      x, // Already normalized (0-1)
      y, // Already normalized (0-1)
      color,
      fontSize,
      timestamp
    };
    
    session.canvasHistory.push(textAction);
    
    // Broadcast text to all participants (coordinates remain normalized)
    socket.to(chatId).emit('whiteboard:text_added', {
      userId,
      text,
      x,
      y,
      color,
      fontSize,
      timestamp
    });
  };

  const handleWhiteboardClear = (socket, data) => {
    const { chatId, userId, timestamp } = data;
    const session = whiteboardSessions.get(chatId);
    
    if (!session) return;
    
    // Check if whiteboard is locked and user is not admin
    if (session.locked && session.adminId !== userId) {
      socket.emit('whiteboard:error', { message: 'Whiteboard is locked by admin' });
      return;
    }
    
    // Add to canvas history
    const clearAction = {
      type: 'canvas_cleared',
      userId,
      timestamp
    };
    
    session.canvasHistory.push(clearAction);
    
    // Broadcast clear to all participants
    socket.to(chatId).emit('whiteboard:canvas_cleared', {
      userId,
      timestamp
    });
  };

  const handleWhiteboardToggleLock = async (socket, data) => {
    const { chatId, userId } = data;
    const session = whiteboardSessions.get(chatId);

    if (!session) return;

    if (session.adminId === userId) {
      session.locked = !session.locked;
      io.to(chatId).emit('whiteboard:lock_status', { isLocked: session.locked, adminId: userId });
      console.log(`Whiteboard session ${chatId} locked/unlocked by admin ${userId}`);
    }
  };

  // Undo handler
  const handleWhiteboardUndo = (socket, data) => {
    const { chatId, userId } = data;
    const session = whiteboardSessions.get(chatId);
    if (!session) return;

    // Remove last action (optionally, only if by this user)
    const lastAction = session.canvasHistory.pop();
    // Optionally, keep a redo stack per session for redo support
    if (!session.redoStack) session.redoStack = [];
    if (lastAction) session.redoStack.push(lastAction);

    // Broadcast new history to all clients
    io.to(chatId).emit('whiteboard:board_state', {
      chatId,
      actions: session.canvasHistory
    });
  };

  // Redo handler
  const handleWhiteboardRedo = (socket, data) => {
    const { chatId, userId } = data;
    const session = whiteboardSessions.get(chatId);
    if (!session || !session.redoStack || session.redoStack.length === 0) return;

    // Restore last undone action
    const redoAction = session.redoStack.pop();
    if (redoAction) session.canvasHistory.push(redoAction);

    // Broadcast new history to all clients
    io.to(chatId).emit('whiteboard:board_state', {
      chatId,
      actions: session.canvasHistory
    });
  };

  // Erase handler (treat as draw with tool: 'eraser')
  const handleWhiteboardErase = (socket, data) => {
    // Just call draw handler with tool: 'eraser'
    handleWhiteboardDraw(socket, { ...data, tool: 'eraser' });
  };

  // Voice chat event handlers
  const handleVoiceJoin = async (socket, data) => {
    const { sessionId, userId, userInfo } = data;
    
    if (!voiceSessions.has(sessionId)) {
      voiceSessions.set(sessionId, {
        participants: [],
        mutedUsers: new Set()
      });
    }
    
    const session = voiceSessions.get(sessionId);
    const participant = {
      socketId: socket.id,
      userId,
      userInfo,
      isMuted: false,
      joinedAt: new Date()
    };
    
    session.participants.push(participant);
    socket.join(sessionId);
    
    io.to(sessionId).emit('voice:user_joined', {
      participant,
      allParticipants: session.participants
    });
    
    console.log(`User ${userId} joined voice session ${sessionId}`);
  };

  const handleVoiceLeave = async (socket, data) => {
    const { sessionId, userId } = data;
    const session = voiceSessions.get(sessionId);

    if (!session) return;

    session.participants = session.participants.filter(p => p.socketId !== socket.id);
    if (session.participants.length === 0) {
      voiceSessions.delete(sessionId);
    } else {
      io.to(sessionId).emit('voice:user_left', { socketId: socket.id });
    }
    console.log(`User ${userId} left voice session ${sessionId}`);
  };

  const handleVoiceSignal = (socket, data) => {
    const { sessionId, targetSocketId, signal, type } = data;
    
    // Forward WebRTC signaling to target user
    io.to(targetSocketId).emit('voice:signaling', {
      fromSocketId: socket.id,
      signal,
      type
    });
  };

  const handleVoiceSpeaking = (socket, data) => {
    const { sessionId, isSpeaking } = data;
    io.to(sessionId).emit('voice:speaking', { isSpeaking });
  };

  const handleVoiceMute = (socket, data) => {
    const { sessionId, userId, isMuted } = data;
    const session = voiceSessions.get(sessionId);
    
    if (!session) return;
    
    const participant = session.participants.find(p => p.socketId === socket.id);
    if (participant) {
      participant.isMuted = isMuted;
      if (isMuted) {
        session.mutedUsers.add(userId);
      } else {
        session.mutedUsers.delete(userId);
      }
      
      io.to(sessionId).emit('voice:user_muted', {
        userId,
        isMuted,
        socketId: socket.id
      });
    }
  };

  const handleVoiceAdminMute = (socket, data) => {
    const { sessionId, targetUserId, isMuted } = data;
    const session = voiceSessions.get(sessionId);
    
    if (!session) return;
    
    const targetParticipant = session.participants.find(p => p.userId === targetUserId);
    if (targetParticipant) {
      targetParticipant.isMuted = isMuted;
      if (isMuted) {
        session.mutedUsers.add(targetUserId);
      } else {
        session.mutedUsers.delete(targetUserId);
      }
      
      io.to(targetParticipant.socketId).emit('voice:admin_muted', { isMuted });
      io.to(sessionId).emit('voice:user_muted', {
        userId: targetUserId,
        isMuted,
        socketId: targetParticipant.socketId
      });
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
                console.error("Error updating lastSeen:", error);
            }
        }, 30000); // Update every 30 seconds

        socket.on("disconnect", () => {
            clearInterval(heartbeat);
            disconnect(socket);
        });

        // Message events
        socket.on("sendMessage", (data) => {
            sendMessage(data);
        });

        socket.on("send-channel-message", (data) => {
            sendChannelMessage(data);
        });

        // Universe system events
        socket.on("joinUniverse", (data) => {
            const { dmId, universeId } = data;
            const roomId = `${dmId}_${universeId}`;
            socket.join(roomId);
            console.log(`User ${userId} joined universe room: ${roomId}`);
        });

        socket.on("leaveUniverse", (data) => {
            const { dmId, universeId } = data;
            const roomId = `${dmId}_${universeId}`;
            socket.leave(roomId);
            console.log(`User ${userId} left universe room: ${roomId}`);
        });

        socket.on("sendUniverseMessage", async (data) => {
            const { dmId, universeId, content, messageType, fileUrl } = data;
            const roomId = `${dmId}_${universeId}`;
            
            try {
                // Import DM model
                const DM = (await import("./models/MessagesModel.js")).default;
                const dm = await DM.findById(dmId);
                if (!dm) return;
                
                const universe = dm.universes.id(universeId);
                if (!universe) return;
                
                const message = {
                    sender: userId,
                    content,
                    messageType,
                    fileUrl,
                    timestamp: new Date(),
                    status: "sent",
                    read: false
                };
                
                universe.messages.push(message);
                await dm.save();
                
                // Broadcast to all users in this universe
                io.to(roomId).emit("receiveUniverseMessage", {
                    dmId,
                    universeId,
                    message: universe.messages[universe.messages.length - 1]
                });
                
            } catch (error) {
                console.error("Error sending universe message:", error);
            }
        });

        // Typing events
        socket.on("typing", (data) => {
            const { recipient, isTyping } = data;
            const recipientSocketId = userSocketMap.get(recipient);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit("typing", { sender: userId, isTyping });
            }
        });

        // Whiteboard events
        socket.on("whiteboard:join", (data) => {
            handleWhiteboardJoin(socket, { ...data, userId });
        });

        socket.on("whiteboard:leave", (data) => {
            handleWhiteboardLeave(socket, { ...data, userId });
        });

        socket.on("whiteboard:draw", (data) => {
            handleWhiteboardDraw(socket, { ...data, userId });
        });

        socket.on("whiteboard:shape_drawn", (data) => {
            handleWhiteboardShape(socket, { ...data, userId });
        });

        socket.on("whiteboard:text_added", (data) => {
            handleWhiteboardText(socket, { ...data, userId });
        });

        socket.on("whiteboard:canvas_cleared", (data) => {
            handleWhiteboardClear(socket, { ...data, userId });
        });

        socket.on("whiteboard:save_snapshot", (data) => {
            handleWhiteboardSnapshot(socket, { ...data, userId });
        });

        socket.on("whiteboard:toggle_lock", (data) => {
            handleWhiteboardToggleLock(socket, { ...data, userId });
        });

        socket.on("whiteboard:cursor_move", (data) => {
            const { chatId, x, y, tool, userName, timestamp } = data;
            socket.to(chatId).emit('whiteboard:cursor_move', {
                userId,
                x,
                y,
                tool,
                userName,
                timestamp
            });
        });

        socket.on("whiteboard:undo", (data) => {
            handleWhiteboardUndo(socket, { ...data, userId });
        });
        socket.on("whiteboard:redo", (data) => {
            handleWhiteboardRedo(socket, { ...data, userId });
        });
        socket.on("whiteboard:erase", (data) => {
            handleWhiteboardErase(socket, { ...data, userId });
        });

        // Voice chat events
        socket.on("whiteboard:voice_join", (data) => {
            handleVoiceJoin(socket, { ...data, userId });
        });

        socket.on("whiteboard:voice_leave", (data) => {
            handleVoiceLeave(socket, { ...data, userId });
        });

        socket.on("whiteboard:voice_signal", (data) => {
            handleVoiceSignal(socket, { ...data, userId });
        });

        socket.on("whiteboard:voice_speaking", (data) => {
            handleVoiceSpeaking(socket, { ...data, userId });
        });

        socket.on("voice:mute", (data) => {
            handleVoiceMute(socket, { ...data, userId });
        });

        socket.on("voice:admin_mute", (data) => {
            handleVoiceAdminMute(socket, { ...data, userId });
        });

        socket.on("voice:leave", (data) => {
            const { sessionId } = data;
            const session = voiceSessions.get(sessionId);
            if (session) {
                session.participants = session.participants.filter(p => p.socketId !== socket.id);
                if (session.participants.length === 0) {
                    voiceSessions.delete(sessionId);
                } else {
                    io.to(sessionId).emit('voice:user_left', { socketId: socket.id });
                }
            }
        });
    }
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