const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectDB = require('./config/db');

const productRoutes = require('./routes/products');
const customerRoutes = require('./routes/customers');
const salesRoutes = require('./routes/sales');
const orderRoutes = require('./routes/orders');
const whatsappRoutes = require('./routes/whatsapp');
const authRoutes = require('./routes/auth');
const uploadRoutes = require('./routes/upload');
const categoryRoutes = require('./routes/categories');
const offerRoutes = require('./routes/offers');
const paytmRoutes = require('./routes/paytm');

const app = express();
const PORT = process.env.PORT || 5050;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/offers', offerRoutes);
app.use('/api/v1/paytm', paytmRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Supermart POS Engine',
    timestamp: new Date(),
    mongoState: require('mongoose').connection.readyState === 1 ? 'CONNECTED' : 'STANDBY'
  });
});

// Serve frontend build static files in production if dist exists
const distPath = path.join(__dirname, '../web/dist');
if (require('fs').existsSync(distPath)) {
  app.use(express.static(distPath));
  // Only serve index.html for non-API routes — prevents wildcard from intercepting /api/* paths
  app.get(/^(?!\/api).*$/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Only listen if not running on Vercel Serverless
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Supermart Full-Stack Server running on port ${PORT}`);
    console.log(`🔌 Socket.io enabled for real-time order tracking`);
    console.log(`🛒 POS Billing, MongoDB, Udhar Ledger & Delivery Ready`);
    console.log(`====================================================`);
  });
}

// Export for Vercel Serverless Functions
module.exports = app;
