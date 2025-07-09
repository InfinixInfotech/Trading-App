import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import tradingRoutes from './routes/trading.js';
import strategiesRoutes from './routes/strategies.js';
import { handleSocketConnection } from './sockets/tradingSocket.js';
import { initMarketDataSocket } from './sockets/marketDataSocket.js';

import yahooFinance from 'yahoo-finance2';


dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
    credentials: true
  }
});

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    headers: {
      authorization: req.headers.authorization ? 'Bearer ***' : 'None',
      'content-type': req.headers['content-type']
    }
  });
  next();
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());


// Environment variables check
console.log('🔧 Environment Configuration:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  UPSTOX_CLIENT_ID: process.env.UPSTOX_CLIENT_ID ? '***' : 'NOT SET',
  UPSTOX_CLIENT_SECRET: process.env.UPSTOX_CLIENT_SECRET ? '***' : 'NOT SET',
  UPSTOX_REDIRECT_URI: process.env.UPSTOX_REDIRECT_URI,
  UPSTOX_ENV: process.env.UPSTOX_ENV || 'sandbox',
  SYSTEM_ACCESS_TOKEN: process.env.SYSTEM_ACCESS_TOKEN ? '***' : 'NOT SET'
});

// Routes
app.use('/auth', authRoutes);
app.use('/trading', tradingRoutes);
app.use('/strategies', strategiesRoutes);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Socket connection established:', socket.id);
  handleSocketConnection(io, socket);
});

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: {
      node_version: process.version,
      platform: process.platform,
      memory: process.memoryUsage()
    }
  };
  
  console.log('💚 Health check requested:', health);
  res.json(health);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server error:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Market Data WebSocket relay setup
initMarketDataSocket(io);


const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 API URL: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket URL: ws://localhost:${PORT}`);
});

export { io };