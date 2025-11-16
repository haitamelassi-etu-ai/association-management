const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const beneficiaryRoutes = require('./routes/beneficiaries');
const announcementRoutes = require('./routes/announcements');
const attendanceRoutes = require('./routes/attendance');
const analyticsRoutes = require('./routes/analytics');
const documentsRoutes = require('./routes/documents');
const notificationsRoutes = require('./routes/notifications');
const chatRoutes = require('./routes/chat');
const backupRoutes = require('./routes/backup');
const mealsRoutes = require('./routes/meals');
const advancedReportsRoutes = require('./routes/advancedReports');

const app = express();
const server = http.createServer(app);

// CORS Origins - Dynamic based on environment
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [process.env.FRONTEND_URL]
  : ['http://localhost:5173', 'http://localhost:5174', 'http://192.168.1.3:5173', 'http://192.168.1.3:5174'];

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Middleware - CORS configuration for network access
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/meals', mealsRoutes);
app.use('/api/reports/advanced', advancedReportsRoutes);

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Socket.io authentication middleware
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.io connection handling
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.userId}`);
  
  // Track online user
  onlineUsers.set(socket.userId, socket.id);
  io.emit('users:online', Array.from(onlineUsers.keys()));
  
  // Join user's personal room
  socket.join(`user:${socket.userId}`);
  
  // Handle private messages
  socket.on('message:send', async (data) => {
    try {
      const Message = require('./models/Message');
      
      const message = await Message.create({
        sender: socket.userId,
        receiver: data.receiverId,
        content: data.content,
        type: data.type || 'text',
        attachments: data.attachments || []
      });
      
      await message.populate('sender', 'name email role avatar');
      await message.populate('receiver', 'name email role avatar');
      
      // Send to receiver if online
      const receiverSocketId = onlineUsers.get(data.receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('message:received', message);
      }
      
      // Confirm to sender
      socket.emit('message:sent', message);
      
      // Create notification for receiver
      const { createNotification } = require('./utils/notificationHelper');
      await createNotification({
        recipient: data.receiverId,
        type: 'info',
        title: 'Nouveau message',
        message: `${message.sender.name} vous a envoyé un message`,
        link: `/chat/${socket.userId}`,
        metadata: {
          userId: socket.userId,
          action: 'message'
        },
        createdBy: socket.userId
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message:error', { error: error.message });
    }
  });
  
  // Handle typing indicator
  socket.on('typing:start', (data) => {
    const receiverSocketId = onlineUsers.get(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing:user', {
        userId: socket.userId,
        isTyping: true
      });
    }
  });
  
  socket.on('typing:stop', (data) => {
    const receiverSocketId = onlineUsers.get(data.receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('typing:user', {
        userId: socket.userId,
        isTyping: false
      });
    }
  });
  
  // Handle message read status
  socket.on('message:read', async (data) => {
    try {
      const Message = require('./models/Message');
      await Message.updateMany(
        { 
          _id: { $in: data.messageIds },
          receiver: socket.userId,
          isRead: false
        },
        { 
          isRead: true,
          readAt: new Date()
        }
      );
      
      // Notify sender that messages were read
      const senderSocketId = onlineUsers.get(data.senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('messages:read', {
          messageIds: data.messageIds,
          readBy: socket.userId
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.userId}`);
    onlineUsers.delete(socket.userId);
    io.emit('users:online', Array.from(onlineUsers.keys()));
  });
});

// Make io accessible to routes
app.set('io', io);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'API Association Adel Elouerif - Professional Portal' });
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connecté avec succès');
  } catch (error) {
    console.error('❌ Erreur de connexion MongoDB:', error.message);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Listen on all network interfaces

connectDB().then(() => {
  server.listen(PORT, HOST, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`📡 API disponible sur http://localhost:${PORT}`);
    console.log(`🌐 Network: http://192.168.1.3:${PORT}`);
    console.log(`💬 Socket.io ready for real-time chat`);
  });
});

module.exports = app;
