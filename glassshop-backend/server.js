const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs   = require('fs');

// ── Auto-create .env from .env.example on first run ───────────────────────────
const ENV_PATH     = path.resolve(__dirname, '.env');
const EXAMPLE_PATH = path.resolve(__dirname, '.env.example');

if (!fs.existsSync(ENV_PATH)) {
  if (fs.existsSync(EXAMPLE_PATH)) {
    fs.copyFileSync(EXAMPLE_PATH, ENV_PATH);
    console.log('\n📝  .env file created from .env.example');
    console.log('    Open  glassshop-backend/.env  and set:\n');
    console.log('       DB_PASSWORD=your_postgres_password\n');
  } else {
    console.warn('\n⚠️   No .env or .env.example found in glassshop-backend/');
    console.warn('    Create glassshop-backend/.env with at least DB_PASSWORD set.\n');
  }
}

require('dotenv').config({ path: ENV_PATH });

// ── Pre-flight: fail fast with a clear message if DB_PASSWORD is not set ──────
if (!process.env.DB_PASSWORD) {
  console.error('\n' + '═'.repeat(55));
  console.error('  ❌  DB_PASSWORD is not set');
  console.error('═'.repeat(55));
  console.error('\n  PostgreSQL 14+ uses SCRAM-SHA-256 authentication');
  console.error('  which requires a password.  To fix:\n');
  console.error('  1.  Open   glassshop-backend/.env');
  console.error('  2.  Set    DB_PASSWORD=your_postgres_password');
  console.error('  3.  Run    npm run dev\n');
  process.exit(1);
}

const { sequelize } = require('./models');
const { authMiddleware } = require('./middleware/auth');
const { initDatabase }   = require('./utils/dbInit');
const { runSeeder }      = require('./utils/seeder');

// Import routes
const authRoutes = require('./routes/auth');
const stockRoutes = require('./routes/stock');
const customerRoutes = require('./routes/customer');
const quotationRoutes = require('./routes/quotation');
const invoiceRoutes = require('./routes/invoice');
const auditRoutes = require('./routes/audit');
const aiRoutes = require('./routes/ai');
const glassPriceMasterRoutes = require('./routes/glassPriceMaster');
const glassTypeRoutes = require('./routes/glassTypes');
const architectRoutes = require('./routes/architect');
const settingsRoutes  = require('./routes/settings');

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
app.use('/api/glass-types', authMiddleware, glassTypeRoutes);
app.use('/api/architects', authMiddleware, architectRoutes);
app.use('/api/settings',  authMiddleware, settingsRoutes);

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

// ── Startup ───────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // 1. Create DB if needed, run migrations, sync Sequelize models
    await initDatabase(sequelize);

    // 2. Seed default admin user + sample data (dev only)
    await runSeeder();

    // 3. Start HTTP server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server ready  ->  http://localhost:${PORT}\n`);
    });
  } catch (err) {
    console.error('\n❌ Startup failed:', err.message);
    process.exit(1);
  }
};

startServer();

module.exports = app;
