const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Issue = require('../models/Issue');
const Message = require('../models/Message');
const { sendChatNotificationEmail } = require('../services/emailService');

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
    // Each user joins their own personal room for notifications
    socket.join(`user:${socket.user._id}`);
    console.log(`Socket connected: ${socket.user.name} (${socket.user.role})`);

    // Join issue room (admin-tenant chat)
    socket.on('join_issue', (issueId) => {
      socket.join(`issue:${issueId}`);
    });

    socket.on('leave_issue', (issueId) => {
      socket.leave(`issue:${issueId}`);
    });

    // Join maintenance-specific chat room
    socket.on('join_maintenance_chat', ({ issueId, maintenanceId }) => {
      socket.join(`issue:${issueId}:maint:${maintenanceId}`);
    });

    socket.on('leave_maintenance_chat', ({ issueId, maintenanceId }) => {
      socket.leave(`issue:${issueId}:maint:${maintenanceId}`);
    });

    // Handle new chat message (admin-tenant or tenant-maintenance)
    socket.on('send_message', async (data) => {
      try {
        const { issueId, message, maintenanceId, messageType, quoteAmount } = data;
        if (!issueId || !message?.trim()) return;

        const newMsg = await Message.create({
          issueId,
          senderId: socket.user._id,
          senderRole: socket.user.role,
          senderName: socket.user.name,
          message: message.trim(),
          maintenanceId: maintenanceId || null,
          messageType: messageType || 'text',
          quoteAmount: quoteAmount || null,
        });

        const roomKey = maintenanceId ? `issue:${issueId}:maint:${maintenanceId}` : `issue:${issueId}`;

        const msgPayload = {
          _id: newMsg._id,
          issueId,
          senderId: socket.user._id,
          senderRole: socket.user.role,
          senderName: socket.user.name,
          message: newMsg.message,
          maintenanceId: newMsg.maintenanceId,
          messageType: newMsg.messageType,
          quoteAmount: newMsg.quoteAmount,
          isRead: false,
          createdAt: newMsg.createdAt,
        };

        // Broadcast to everyone in the issue room
        io.to(roomKey).emit('new_message', msgPayload);

        // Also send to recipient's personal room for popup notifications
        try {
          const issue = await Issue.findById(issueId).populate('tenantId', '_id');
          if (issue) {
            if (socket.user.role === 'tenant') {
              // Notify all admins via personal room (find all admin sockets)
              const adminSockets = await io.fetchSockets();
              adminSockets.forEach(s => {
                if (s.user?.role === 'admin') s.emit('new_message_notification', msgPayload);
              });
            } else if (socket.user.role === 'admin' || socket.user.role === 'maintenance') {
              // Notify the tenant
              const tenantId = issue.tenantId?._id;
              if (tenantId) io.to(`user:${tenantId}`).emit('new_message_notification', msgPayload);
            }
          }
        } catch (notifErr) {
          console.error('Notification emit error:', notifErr.message);
        }

        // Send email notification to the other party
        try {
          const issue = await Issue.findById(issueId).populate('tenantId', 'name email');
          if (issue) {
            if (socket.user.role === 'tenant') {
              // Tenant sent → notify admin
              await sendChatNotificationEmail({
                toEmail: process.env.ADMIN_EMAIL,
                toName: 'Admin',
                fromName: socket.user.name,
                fromRole: 'tenant',
                issueTitle: issue.title,
                issueId,
                messageText: newMsg.message,
              });
            } else {
              // Admin sent → notify tenant
              const tenant = issue.tenantId;
              if (tenant?.email) {
                await sendChatNotificationEmail({
                  toEmail: tenant.email,
                  toName: tenant.name,
                  fromName: socket.user.name,
                  fromRole: 'admin',
                  issueTitle: issue.title,
                  issueId,
                  messageText: newMsg.message,
                });
              }
            }
          }
        } catch (emailErr) {
          console.error('Chat email notification error:', emailErr.message);
        }
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
