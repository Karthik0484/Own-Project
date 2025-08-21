const { v4: uuidv4 } = require('uuid');

class WhiteboardService {
  constructor() {
    this.rooms = new Map(); // chatId -> room data
    this.userSessions = new Map(); // socketId -> user session
  }

  // Create or get a room
  getRoom(chatId) {
    if (!this.rooms.has(chatId)) {
      this.rooms.set(chatId, {
        id: chatId,
        participants: new Set(),
        actions: [],
        canvasState: null,
        createdAt: Date.now(),
        lastActivity: Date.now()
      });
    }
    return this.rooms.get(chatId);
  }

  // Join a whiteboard room
  joinRoom(chatId, userId, userInfo, socketId) {
    const room = this.getRoom(chatId);
    
    // Add user to room
    room.participants.add(socketId);
    room.lastActivity = Date.now();
    
    // Store user session
    this.userSessions.set(socketId, {
      userId,
      userInfo,
      chatId,
      joinedAt: Date.now()
    });

    return {
      room,
      participants: Array.from(room.participants).map(sid => {
        const session = this.userSessions.get(sid);
        return session ? session.userInfo : null;
      }).filter(Boolean)
    };
  }

  // Leave a whiteboard room
  leaveRoom(socketId) {
    const session = this.userSessions.get(socketId);
    if (!session) return;

    const room = this.rooms.get(session.chatId);
    if (room) {
      room.participants.delete(socketId);
      room.lastActivity = Date.now();
      
      // Clean up empty rooms
      if (room.participants.size === 0) {
        this.rooms.delete(session.chatId);
      }
    }

    this.userSessions.delete(socketId);
    return session;
  }

  // Add action to room history
  addAction(chatId, action) {
    const room = this.getRoom(chatId);
    action.id = uuidv4();
    action.timestamp = Date.now();
    
    room.actions.push(action);
    room.lastActivity = Date.now();
    
    // Keep only last 100 actions to prevent memory issues
    if (room.actions.length > 100) {
      room.actions = room.actions.slice(-100);
    }
    
    return action;
  }

  // Get room state for new users
  getRoomState(chatId) {
    const room = this.getRoom(chatId);
    return {
      actions: room.actions,
      canvasState: room.canvasState,
      participants: Array.from(room.participants).map(sid => {
        const session = this.userSessions.get(sid);
        return session ? session.userInfo : null;
      }).filter(Boolean)
    };
  }

  // Update canvas state
  updateCanvasState(chatId, canvasState) {
    const room = this.getRoom(chatId);
    room.canvasState = canvasState;
    room.lastActivity = Date.now();
  }

  // Get user session
  getUserSession(socketId) {
    return this.userSessions.get(socketId);
  }

  // Get room participants
  getRoomParticipants(chatId) {
    const room = this.getRoom(chatId);
    return Array.from(room.participants).map(sid => {
      const session = this.userSessions.get(sid);
      return session ? session.userInfo : null;
    }).filter(Boolean);
  }

  // Clean up old rooms (called periodically)
  cleanup() {
    const now = Date.now();
    const MAX_INACTIVE_TIME = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [chatId, room] of this.rooms.entries()) {
      if (now - room.lastActivity > MAX_INACTIVE_TIME) {
        this.rooms.delete(chatId);
      }
    }
  }

  // Get statistics
  getStats() {
    return {
      totalRooms: this.rooms.size,
      totalUsers: this.userSessions.size,
      rooms: Array.from(this.rooms.entries()).map(([chatId, room]) => ({
        chatId,
        participants: room.participants.size,
        actions: room.actions.length,
        lastActivity: room.lastActivity
      }))
    };
  }
}

module.exports = new WhiteboardService();
