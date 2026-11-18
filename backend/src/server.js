const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const dns = require('dns');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Configure DNS to reliably resolve MongoDB SRV records in containerized environments
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Use default DNS if override is restricted
}

dotenv.config();

// Import utilities
const logger = require('./utils/logger');
const notificationService = require('./services/notificationService');
const { initDatabase } = require('./config/initDatabase');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');

// Import routes
const authRoutes = require('./routes/authRoutes');
const groupRoutes = require('./routes/groupRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const settlementRoutes = require('./routes/settlementRoutes');
const friendRoutes = require('./routes/friendRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const activityRoutes = require('./routes/activityRoutes');
const accountRoutes = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const plannedExpenseRoutes = require('./routes/plannedExpenseRoutes');
const savingsGoalRoutes = require('./routes/savingsGoalRoutes');
const smsParserRoutes = require('./routes/smsParserRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Pass io instance to notification service
notificationService.setIo(io);

// Make io accessible to routes
app.set('io', io);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);
app.use('/api', limiter);

// API Routes
app.use(`/api/${process.env.API_VERSION}/auth`, authRoutes);
app.use(`/api/${process.env.API_VERSION}/groups`, groupRoutes);
app.use(`/api/${process.env.API_VERSION}/expenses`, expenseRoutes);
app.use(`/api/${process.env.API_VERSION}/settlements`, settlementRoutes);
app.use(`/api/${process.env.API_VERSION}/friends`, friendRoutes);
app.use(`/api/${process.env.API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${process.env.API_VERSION}/activities`, activityRoutes);
app.use(`/api/${process.env.API_VERSION}/accounts`, accountRoutes);
app.use(`/api/${process.env.API_VERSION}/transactions`, transactionRoutes);
app.use(`/api/${process.env.API_VERSION}/budgets`, budgetRoutes);
app.use(`/api/${process.env.API_VERSION}/planned-expenses`, plannedExpenseRoutes);
app.use(`/api/${process.env.API_VERSION}/savings-goals`, savingsGoalRoutes);
app.use(`/api/${process.env.API_VERSION}/sms`, smsParserRoutes);
app.use(`/api/${process.env.API_VERSION}/reports`, reportRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  logger.info('New client connected');
  
  socket.on('join-user', (userId) => {
    socket.join(`user_${userId}`);
    logger.info(`User joined user channel user_${userId}`);
  });

  socket.on('leave-user', (userId) => {
    socket.leave(`user_${userId}`);
    logger.info(`User left user channel user_${userId}`);
  });

  socket.on('join-group', (groupId) => {
    socket.join(`group_${groupId}`);
    logger.info(`User joined group ${groupId}`);
  });
  
  socket.on('leave-group', (groupId) => {
    socket.leave(`group_${groupId}`);
    logger.info(`User left group ${groupId}`);
  });
  
  socket.on('disconnect', () => {
    logger.info('Client disconnected');
  });
});

// Error handling middleware
app.use(errorHandler);

// Database connection
mongoose.connect(process.env.MONGODB_URI)
.then(async () => {
  logger.info('Connected to MongoDB');
  
  // Verify and create database tables/collections and indexes
  await initDatabase();
  
  const PORT = process.env.PORT || 3000;

  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use. Try killing the running process or choose a different PORT in .env.`);
    } else {
      logger.error('HTTP Server listen error:', err);
    }
    process.exit(1);
  });

  httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
  });
})
.catch((error) => {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, io };
