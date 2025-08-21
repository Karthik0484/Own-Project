const whiteboardRooms = new Map();

class WhiteboardRoom {
  constructor(chatId, chatType) {
    this.chatId = chatId;
    this.chatType = chatType;
    this.participants = new Map(); // userId -> { socketId, userInfo, isAdmin }
    this.actionHistory = []; // Store all drawing actions
    this.currentCanvasState = null; // Current canvas state as base64
    this.isLocked = false;
    this.adminId = null;
  }

  addParticipant(userId, socketId, userInfo, isAdmin = false) {
    this.participants.set(userId, {
      socketId,
      userInfo,
      isAdmin,
      joinedAt: Date.now()
    });

    if (isAdmin) {
      this.adminId = userId;
    }

    return {
      allParticipants: Array.from(this.participants.values()).map(p => ({
        userId: p.userInfo.id,
        socketId: p.socketId,
        userInfo: p.userInfo,
        isAdmin: p.isAdmin
      })),
      isAdmin: isAdmin
    };
  }

  removeParticipant(userId) {
    const participant = this.participants.get(userId);
    if (participant) {
      this.participants.delete(userId);
      
      // If admin left, assign admin to next participant
      if (userId === this.adminId && this.participants.size > 0) {
        const nextParticipant = Array.from(this.participants.entries())[0];
        this.adminId = nextParticipant[0];
        nextParticipant[1].isAdmin = true;
      }
      
      return participant;
    }
    return null;
  }

  addAction(action) {
    this.actionHistory.push({
      ...action,
      timestamp: Date.now()
    });

    // Keep only last 100 actions to prevent memory issues
    if (this.actionHistory.length > 100) {
      this.actionHistory = this.actionHistory.slice(-100);
    }
  }

  updateCanvasState(canvasState) {
    this.currentCanvasState = canvasState;
  }

  getRoomState() {
    return {
      chatId: this.chatId,
      chatType: this.chatType,
      participants: Array.from(this.participants.values()).map(p => ({
        userId: p.userInfo.id,
        socketId: p.socketId,
        userInfo: p.userInfo,
        isAdmin: p.isAdmin
      })),
      actionHistory: this.actionHistory,
      currentCanvasState: this.currentCanvasState,
      isLocked: this.isLocked,
      adminId: this.adminId
    };
  }

  broadcastToOthers(socket, event, data) {
    this.participants.forEach((participant, userId) => {
      if (participant.socketId !== socket.id) {
        socket.to(participant.socketId).emit(event, data);
      }
    });
  }
}

const whiteboardHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected to whiteboard:', socket.id);

    // Join whiteboard room
    socket.on('whiteboard:join', (data) => {
      const { chatId, chatType, userId, userInfo } = data;
      const roomKey = `${chatType}:${chatId}`;

      // Leave previous room if any
      socket.rooms.forEach(room => {
        if (room.startsWith('whiteboard:')) {
          socket.leave(room);
        }
      });

      // Join new room
      socket.join(`whiteboard:${roomKey}`);

      // Get or create room
      let room = whiteboardRooms.get(roomKey);
      if (!room) {
        room = new WhiteboardRoom(chatId, chatType);
        whiteboardRooms.set(roomKey, room);
      }

      // Add participant
      const isAdmin = room.participants.size === 0 || userId === room.adminId;
      const participantData = room.addParticipant(userId, socket.id, userInfo, isAdmin);

      // Send room state to new participant
      socket.emit('whiteboard:board_state', {
        canvasState: room.currentCanvasState,
        actionHistory: room.actionHistory
      });

      // Notify others about new participant
      room.broadcastToOthers(socket, 'whiteboard:user_joined', {
        participant: participantData,
        allParticipants: room.getRoomState().participants
      });

      console.log(`User ${userInfo.name} joined whiteboard room ${roomKey}`);
    });

    // Handle drawing start
    socket.on('whiteboard:draw_start', (data) => {
      const roomKey = `${data.chatType}:${data.chatId}`;
      const room = whiteboardRooms.get(roomKey);
      
      if (room) {
        room.addAction(data);
        room.broadcastToOthers(socket, 'whiteboard:draw_start', data);
      }
    });

    // Handle drawing move (throttled)
    socket.on('whiteboard:draw_move', (data) => {
      const roomKey = `${data.chatType}:${data.chatId}`;
      const room = whiteboardRooms.get(roomKey);
      
      if (room) {
        room.broadcastToOthers(socket, 'whiteboard:draw_move', data);
      }
    });

    // Handle drawing end
    socket.on('whiteboard:draw_end', (data) => {
      const roomKey = `${data.chatType}:${data.chatId}`;
      const room = whiteboardRooms.get(roomKey);
      
      if (room) {
        room.addAction(data);
        room.broadcastToOthers(socket, 'whiteboard:draw_end', data);
      }
    });

    // Handle shape drawing
    socket.on('whiteboard:shape_drawn', (data) => {
      const roomKey = `${data.chatType}:${data.chatId}`;
      const room = whiteboardRooms.get(roomKey);
      
      if (room) {
        room.addAction(data);
        room.broadcastToOthers(socket, 'whiteboard:shape_drawn', data);
      }
    });

    // Handle text addition
    socket.on('whiteboard:text_added', (data) => {
      const roomKey = `${data.chatType}:${data.chatId}`;
      const room = whiteboardRooms.get(roomKey);
      
      if (room) {
        room.addAction(data);
        room.broadcastToOthers(socket, 'whiteboard:text_added', data);
      }
    });

    // Handle canvas clear
    socket.on('whiteboard:canvas_cleared', (data) => {
      const roomKey = `${data.chatType}:${data.chatId}`;
      const room = whiteboardRooms.get(roomKey);
      
      if (room) {
        room.addAction(data);
        room.actionHistory = []; // Clear action history
        room.broadcastToOthers(socket, 'whiteboard:canvas_cleared', data);
      }
    });

    // Handle undo/redo
    socket.on('whiteboard:undo_redo', (data) => {
      const roomKey = `${data.chatType}:${data.chatId}`;
      const room = whiteboardRooms.get(roomKey);
      
      if (room) {
        room.addAction(data);
        room.updateCanvasState(data.canvasState);
        room.broadcastToOthers(socket, 'whiteboard:undo_redo', data);
      }
    });

    // Handle cursor movement
    socket.on('whiteboard:cursor_move', (data) => {
      const roomKey = `${data.chatType}:${data.chatId}`;
      const room = whiteboardRooms.get(roomKey);
      
      if (room) {
        room.broadcastToOthers(socket, 'whiteboard:cursor_move', data);
      }
    });

    // Handle lock/unlock
    socket.on('whiteboard:toggle_lock', (data) => {
      const roomKey = `${data.chatType}:${data.chatId}`;
      const room = whiteboardRooms.get(roomKey);
      
      if (room && data.userId === room.adminId) {
        room.isLocked = data.isLocked;
        room.broadcastToOthers(socket, 'whiteboard:lock_status', {
          isLocked: room.isLocked,
          adminId: room.adminId
        });
      }
    });

    // Handle save snapshot
    socket.on('whiteboard:save_snapshot', (data) => {
      const roomKey = `${data.chatType}:${data.chatId}`;
      const room = whiteboardRooms.get(roomKey);
      
      if (room) {
        room.updateCanvasState(data.imageData);
        // Here you would typically save to database
        console.log('Snapshot saved for room:', roomKey);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected from whiteboard:', socket.id);
      
      // Find and remove user from room
      whiteboardRooms.forEach((room, roomKey) => {
        const participant = Array.from(room.participants.entries())
          .find(([userId, p]) => p.socketId === socket.id);
        
        if (participant) {
          const [userId, participantData] = participant;
          room.removeParticipant(userId);
          
          // Notify others about user leaving
          room.broadcastToOthers(socket, 'whiteboard:user_left', {
            userId,
            userName: participantData.userInfo.name,
            socketId: socket.id
          });

          // Clean up empty rooms
          if (room.participants.size === 0) {
            whiteboardRooms.delete(roomKey);
            console.log(`Cleaned up empty whiteboard room: ${roomKey}`);
          }
        }
      });
    });

    // Handle explicit leave
    socket.on('whiteboard:leave', (data) => {
      const roomKey = `${data.chatType}:${data.chatId}`;
      const room = whiteboardRooms.get(roomKey);
      
      if (room) {
        const participant = room.removeParticipant(data.userId);
        if (participant) {
          room.broadcastToOthers(socket, 'whiteboard:user_left', {
            userId: data.userId,
            userName: participant.userInfo.name,
            socketId: socket.id
          });
        }

        // Clean up empty rooms
        if (room.participants.size === 0) {
          whiteboardRooms.delete(roomKey);
          console.log(`Cleaned up empty whiteboard room: ${roomKey}`);
        }
      }
    });
  });

  // Cleanup function for server shutdown
  const cleanup = () => {
    whiteboardRooms.clear();
    console.log('Whiteboard rooms cleaned up');
  };

  return { cleanup };
};

module.exports = whiteboardHandler;

