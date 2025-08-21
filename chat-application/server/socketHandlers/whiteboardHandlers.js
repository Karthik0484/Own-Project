const whiteboardService = require('../services/whiteboardService');
const jwt = require('jsonwebtoken');

// Middleware to authenticate socket connections
const authenticateSocket = (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
  
  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userInfo = decoded;
    next();
  } catch (error) {
    return next(new Error('Authentication error: Invalid token'));
  }
};

// Whiteboard event handlers
const setupWhiteboardHandlers = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    console.log(`User ${socket.userId} connected to whiteboard`);

    // Join whiteboard room
    socket.on('whiteboard:join', async (data) => {
      try {
        const { chatId, chatType, userId, userInfo } = data;
        
        // Validate user has access to this chat
        // This would typically check if user is a member of the chat/channel
        // For now, we'll assume they have access
        
        const result = whiteboardService.joinRoom(chatId, userId, userInfo, socket.id);
        
        // Join socket room
        socket.join(chatId);
        
        // Send current board state to the joining user
        const roomState = whiteboardService.getRoomState(chatId);
        socket.emit('whiteboard:board_state', {
          chatId,
          canvasState: roomState.canvasState,
          actions: roomState.actions
        });
        
        // Notify other users about the new participant
        socket.to(chatId).emit('whiteboard:user_joined', {
          chatId,
          participant: { userInfo },
          allParticipants: result.participants
        });
        
        console.log(`User ${userId} joined whiteboard room ${chatId}`);
      } catch (error) {
        console.error('Error joining whiteboard room:', error);
        socket.emit('whiteboard:error', { message: 'Failed to join whiteboard room' });
      }
    });

    // Leave whiteboard room
    socket.on('whiteboard:leave', (data) => {
      try {
        const { chatId, userId } = data;
        
        const session = whiteboardService.leaveRoom(socket.id);
        socket.leave(chatId);
        
        if (session) {
          // Notify other users about the leaving participant
          socket.to(chatId).emit('whiteboard:user_left', {
            chatId,
            userId,
            userName: session.userInfo.name,
            socketId: socket.id
          });
        }
        
        console.log(`User ${userId} left whiteboard room ${chatId}`);
      } catch (error) {
        console.error('Error leaving whiteboard room:', error);
      }
    });

    // Drawing start event
    socket.on('whiteboard:draw_start', (data) => {
      try {
        const { chatId, userId, tool, color, brushSize, x, y, timestamp } = data;
        
        // Add action to history
        const action = whiteboardService.addAction(chatId, {
          type: 'draw_start',
          userId,
          tool,
          color,
          brushSize,
          x,
          y,
          timestamp
        });
        
        // Broadcast to other users in the room
        socket.to(chatId).emit('whiteboard:draw_start', {
          ...action,
          chatId
        });
      } catch (error) {
        console.error('Error handling draw start:', error);
      }
    });

    // Drawing move event (throttled)
    socket.on('whiteboard:draw_move', (data) => {
      try {
        const { chatId, userId, tool, color, brushSize, x, y, timestamp } = data;
        
        // Add action to history
        const action = whiteboardService.addAction(chatId, {
          type: 'draw_move',
          userId,
          tool,
          color,
          brushSize,
          x,
          y,
          timestamp
        });
        
        // Broadcast to other users in the room
        socket.to(chatId).emit('whiteboard:draw_move', {
          ...action,
          chatId
        });
      } catch (error) {
        console.error('Error handling draw move:', error);
      }
    });

    // Drawing end event
    socket.on('whiteboard:draw_end', (data) => {
      try {
        const { chatId, userId, type, points, color, brushSize, timestamp } = data;
        
        // Add action to history
        const action = whiteboardService.addAction(chatId, {
          type: 'draw_end',
          userId,
          drawType: type,
          points,
          color,
          brushSize,
          timestamp
        });
        
        // Broadcast to other users in the room
        socket.to(chatId).emit('whiteboard:draw_end', {
          ...action,
          chatId
        });
      } catch (error) {
        console.error('Error handling draw end:', error);
      }
    });

    // Shape drawn event
    socket.on('whiteboard:shape_drawn', (data) => {
      try {
        const { chatId, userId, shapeType, x, y, width, height, radius, color, brushSize, timestamp } = data;
        
        // Add action to history
        const action = whiteboardService.addAction(chatId, {
          type: 'shape_drawn',
          userId,
          shapeType,
          x,
          y,
          width,
          height,
          radius,
          color,
          brushSize,
          timestamp
        });
        
        // Broadcast to other users in the room
        socket.to(chatId).emit('whiteboard:shape_drawn', {
          ...action,
          chatId
        });
      } catch (error) {
        console.error('Error handling shape drawn:', error);
      }
    });

    // Text added event
    socket.on('whiteboard:text_added', (data) => {
      try {
        const { chatId, userId, text, x, y, color, fontSize, timestamp } = data;
        
        // Add action to history
        const action = whiteboardService.addAction(chatId, {
          type: 'text_added',
          userId,
          text,
          x,
          y,
          color,
          fontSize,
          timestamp
        });
        
        // Broadcast to other users in the room
        socket.to(chatId).emit('whiteboard:text_added', {
          ...action,
          chatId
        });
      } catch (error) {
        console.error('Error handling text added:', error);
      }
    });

    // Canvas cleared event
    socket.on('whiteboard:canvas_cleared', (data) => {
      try {
        const { chatId, userId, timestamp } = data;
        
        // Add action to history
        const action = whiteboardService.addAction(chatId, {
          type: 'canvas_cleared',
          userId,
          timestamp
        });
        
        // Update canvas state
        whiteboardService.updateCanvasState(chatId, null);
        
        // Broadcast to other users in the room
        socket.to(chatId).emit('whiteboard:canvas_cleared', {
          ...action,
          chatId
        });
      } catch (error) {
        console.error('Error handling canvas cleared:', error);
      }
    });

    // Undo/Redo event
    socket.on('whiteboard:undo_redo', (data) => {
      try {
        const { chatId, userId, action, canvasState, timestamp } = data;
        
        // Add action to history
        const actionRecord = whiteboardService.addAction(chatId, {
          type: 'undo_redo',
          userId,
          undoRedoAction: action,
          canvasState,
          timestamp
        });
        
        // Update canvas state
        whiteboardService.updateCanvasState(chatId, canvasState);
        
        // Broadcast to other users in the room
        socket.to(chatId).emit('whiteboard:undo_redo', {
          ...actionRecord,
          chatId
        });
      } catch (error) {
        console.error('Error handling undo/redo:', error);
      }
    });

    // Cursor movement event (throttled on client side)
    socket.on('whiteboard:cursor_move', (data) => {
      try {
        const { chatId, userId, x, y, tool, userName, timestamp } = data;
        
        // Broadcast to other users in the room
        socket.to(chatId).emit('whiteboard:cursor_move', {
          chatId,
          userId,
          x,
          y,
          tool,
          userName,
          timestamp
        });
      } catch (error) {
        console.error('Error handling cursor move:', error);
      }
    });

    // Save snapshot event
    socket.on('whiteboard:save_snapshot', (data) => {
      try {
        const { chatId, userId, imageData, timestamp } = data;
        
        // Add action to history
        const action = whiteboardService.addAction(chatId, {
          type: 'snapshot_saved',
          userId,
          imageData,
          timestamp
        });
        
        // Update canvas state
        whiteboardService.updateCanvasState(chatId, imageData);
        
        // Broadcast to other users in the room
        socket.to(chatId).emit('whiteboard:snapshot_saved', {
          ...action,
          chatId
        });
        
        // Here you would typically save the snapshot to your database
        // and send it as a message in the chat
        
        console.log(`Snapshot saved for whiteboard ${chatId} by user ${userId}`);
      } catch (error) {
        console.error('Error handling snapshot save:', error);
      }
    });

    // Lock/Unlock whiteboard
    socket.on('whiteboard:toggle_lock', (data) => {
      try {
        const { chatId, userId, isLocked } = data;
        
        // Add action to history
        const action = whiteboardService.addAction(chatId, {
          type: 'lock_toggled',
          userId,
          isLocked,
          timestamp: Date.now()
        });
        
        // Broadcast to other users in the room
        socket.to(chatId).emit('whiteboard:lock_status', {
          chatId,
          isLocked,
          userId
        });
      } catch (error) {
        console.error('Error handling lock toggle:', error);
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      try {
        const session = whiteboardService.leaveRoom(socket.id);
        
        if (session) {
          // Notify other users about the disconnection
          socket.to(session.chatId).emit('whiteboard:user_left', {
            chatId: session.chatId,
            userId: session.userId,
            userName: session.userInfo.name,
            socketId: socket.id
          });
        }
        
        console.log(`User ${socket.userId} disconnected from whiteboard`);
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
};

module.exports = {
  setupWhiteboardHandlers,
  authenticateSocket
};
