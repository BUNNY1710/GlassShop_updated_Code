const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { sequelize } = require('./models');
const { authMiddleware } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const stockRoutes = require('./routes/stock');
const customerRoutes = require('./routes/customer');
const quotationRoutes = require('./routes/quotation');
const invoiceRoutes = require('./routes/invoice');
const auditRoutes = require('./routes/audit');
const aiRoutes = require('./routes/ai');
const glassPriceMasterRoutes = require('./routes/glassPriceMaster');
const architectRoutes = require('./routes/architect');

const app = express();
const PORT = process.env.PORT || 8080;

// ==================== CORS CONFIGURATION ====================
// Simplified and permissive CORS for EC2 deployment

// Get EC2 IP from environment or use default
const EC2_IP = process.env.EC2_IP || '16.16.73.29';

// ==================== REQUEST LOGGING MIDDLEWARE ====================
// Log ALL incoming requests FIRST (before CORS)
app.use((req, res, next) => {
  console.log('📥 [REQUEST]', req.method, req.path);
  console.log('   Headers:', JSON.stringify(req.headers, null, 2));
  console.log('   IP:', req.ip, '| X-Forwarded-For:', req.get('X-Forwarded-For'));
  next();
});

// ==================== CORS MIDDLEWARE ====================
// Universal CORS - handles ALL requests and sets headers on ALL responses
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // ALWAYS log for debugging (even in production for now)
  console.log('🔍 [CORS] Request:', req.method, req.path, '| Origin:', origin || 'none');
  
  // Set CORS headers for ALL origins (permissive for EC2)
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    console.log('✅ [CORS] Set Allow-Origin:', origin);
  } else {
    res.header('Access-Control-Allow-Origin', '*');
    console.log('✅ [CORS] Set Allow-Origin: * (no origin header)');
  }
  
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, Cache-Control, Pragma');
  res.header('Access-Control-Expose-Headers', 'Authorization, Content-Type');
  res.header('Access-Control-Max-Age', '86400');
  
  // Handle preflight OPTIONS requests IMMEDIATELY
  if (req.method === 'OPTIONS') {
    console.log('✅ [CORS] OPTIONS preflight - returning 200');
    return res.status(200).end();
  }
  
  next();
});

// Also use cors middleware as backup
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Authorization', 'Content-Type'],
  optionsSuccessStatus: 200,
  preflightContinue: false,
  maxAge: 86400
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Public routes (no auth required)
app.use('/api/auth', authRoutes);

// Protected routes (auth required)
app.use('/api/stock', authMiddleware, stockRoutes);
app.use('/api/customers', authMiddleware, customerRoutes);
app.use('/api/quotations', authMiddleware, quotationRoutes);
app.use('/api/invoices', authMiddleware, invoiceRoutes);
app.use('/api/audit', authMiddleware, auditRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/glass-price-master', authMiddleware, glassPriceMasterRoutes);
app.use('/api/architects', authMiddleware, architectRoutes);

// Health check
app.get('/health', (req, res) => {
  console.log('✅ [HEALTH] Health check requested');
  res.json({ status: 'OK', message: 'GlassShop Backend API is running', timestamp: new Date().toISOString() });
});

// Test endpoint for debugging
app.get('/test', (req, res) => {
  console.log('✅ [TEST] Test endpoint hit');
  res.json({ 
    message: 'Backend is reachable!', 
    method: req.method,
    path: req.path,
    origin: req.headers.origin,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Test OPTIONS endpoint
app.options('/test', (req, res) => {
  console.log('✅ [TEST] OPTIONS test endpoint hit');
  res.status(200).end();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Database connection and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync database (set force: false in production, use migrations instead)
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: false });
      console.log('✅ Database models synchronized.');
    }

    // Listen on all interfaces (0.0.0.0) so nginx can proxy to it
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on http://0.0.0.0:${PORT}`);
      console.log(`📡 Accessible at http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
