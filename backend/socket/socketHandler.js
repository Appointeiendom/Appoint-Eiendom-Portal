const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');

// Map of issueId -> Set of socket IDs in that room
const issueRooms = new Map();

const initSocket = (io) => {
  // Authenticate socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user || !user.isActive) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.name} (${socket.user.role})`);

    // Join issue-specific room
    socket.on('join_issue', (issueId) => {
      socket.join(`issue:${issueId}`);
      console.log(`${socket.user.name} joined room issue:${issueId}`);
    });

    socket.on('leave_issue', (issueId) => {
      socket.leave(`issue:${issueId}`);
    });

    // Handle new chat message
    socket.on('send_message', async (data) => {
      try {
        const { issueId, message } = data;
        if (!issueId || !message?.trim()) return;

        const newMsg = await Message.create({
          issueId,
          senderId: socket.user._id,
          senderRole: socket.user.role,
          senderName: socket.user.name,
          message: message.trim(),
        });

        // Broadcast to everyone in the issue room
        io.to(`issue:${issueId}`).emit('new_message', {
          _id: newMsg._id,
          issueId,
          senderId: socket.user._id,
          senderRole: socket.user.role,
          senderName: socket.user.name,
          message: newMsg.message,
          isRead: false,
          createdAt: newMsg.createdAt,
        });
      } catch (error) {
        console.error('Socket send_message error:', error.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicators
    socket.on('typing_start', ({ issueId }) => {
      socket.to(`issue:${issueId}`).emit('user_typing', {
        userId: socket.user._id,
        name: socket.user.name,
        role: socket.user.role,
      });
    });

    socket.on('typing_stop', ({ issueId }) => {
      socket.to(`issue:${issueId}`).emit('user_stopped_typing', {
        userId: socket.user._id,
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.name}`);
    });
  });
};

module.exports = { initSocket };
