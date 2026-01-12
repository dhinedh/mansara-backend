// Trigger restart: FINAL
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

dotenv.config();
console.log('[DEBUG] Environment Config Loaded');

const app = express();
const PORT = process.env.PORT || 5000;

/* ======================================================
   SECURITY & PERFORMANCE
====================================================== */

// Helmet security headers
app.use(helmet());

// Trust proxy (Render)
app.set('trust proxy', 1);

// Disable x-powered-by
app.disable('x-powered-by');

// Rate limiter
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
});
app.use('/api', limiter);

// Gzip compression
app.use(compression({ level: 6 }));

/* ======================================================
   CORS (FINAL FIX)
====================================================== */

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:8080',
  'https://mansarafoods.com',
  'https://www.mansarafoods.com',
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

/* ======================================================
   BODY PARSERS
====================================================== */

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ======================================================
   DATABASE (SAFE & MODERN)
====================================================== */

// ✅ Modern MongoDB sanitization (SAFE replacement)
mongoose.set('sanitizeFilter', true);

mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 120000,
  serverSelectionTimeoutMS: 30000,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
})
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
});

/* ======================================================
   ROUTES
====================================================== */

app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/combos', require('./routes/comboRoutes'));
app.use('/api/categories', require('./routes/categoryRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/upload', require('./routes/uploadRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/contact', require('./routes/contactRoutes'));
app.use('/api/stats', require('./routes/statsRoutes'));
app.use('/api/content', require('./routes/contentRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/blog', require('./routes/blogRoutes'));
app.use('/api/press', require('./routes/pressRoutes'));
app.use('/api/careers', require('./routes/careerRoutes'));
app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));

/* ======================================================
   HEALTH CHECK
====================================================== */

app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Mansara Nourish Hub API is running',
    environment: process.env.NODE_ENV || 'production'
  });
});

/* ======================================================
   ERROR HANDLER
====================================================== */

app.use((err, req, res, next) => {
  console.error('[API ERROR]', err.message);
  res.status(500).json({ message: err.message });
});

/* ======================================================
   START SERVER
====================================================== */

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔒 CORS allowed for mansarafoods.com`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

module.exports = app;
