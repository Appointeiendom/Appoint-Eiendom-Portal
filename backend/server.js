require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { initSocket } = require('./socket/socketHandler');

// Ensure uploads directory exists (kept for any local fallback)
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      callback(null, true); // allow all for socket
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins in development, specific ones in production
    const allowed = [
      'http://localhost:5173',
      'https://appoint-eiendom-portal-rho.vercel.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean);
    if (!origin || allowed.some(o => origin.startsWith(o.replace(/\/$/, '')))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Attach io to every request so controllers can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/users', require('./routes/users'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/waste', require('./routes/wasteReports'));
app.use('/api/settings', require('./routes/settings'));

app.get('/api/health', (req, res) => res.json({ 
  status: 'ok',
  emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
  emailUser: process.env.EMAIL_USER || 'NOT SET',
}));

// Socket.io
initSocket(io);

// Error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
