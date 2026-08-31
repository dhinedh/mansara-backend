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

// Helmet security headers (with relaxed media-src & data: URI support)
app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "https:", "http:", "data:", "blob:"],
            mediaSrc: ["'self'", "data:", "blob:", "https:", "http:"],
            imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
            connectSrc: ["'self'", "https:", "http:", "wss:", "ws:"]
        }
    }
}));

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
    'https://mansarafoodscrm.vercel.app',
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('.lovable.app')) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With', 'Accept', 'Pragma'],
}));

app.options(/(.*)/, cors());

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
app.use('/api/webhooks', require('./routes/webhookRoutes'));
app.use('/api/whatsapp', require('./routes/whatsappRoutes'));

/* ======================================================
   HEALTH CHECK & RENDER KEEPALIVE
====================================================== */

// Ultra-fast lightweight ping endpoint (0 DB overhead, prevents cold starts)
app.get('/api/ping', (req, res) => {
    res.status(200).send('pong');
});

app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Mansara Nourish Hub API is running',
        environment: process.env.NODE_ENV || 'production'
    });
});

// Self-ping interval to keep Render backend awake (pings every 10 minutes)
const PING_INTERVAL = 10 * 60 * 1000;
const EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;

if (EXTERNAL_URL) {
    setInterval(async () => {
        try {
            const response = await fetch(`${EXTERNAL_URL}/api/ping`);
            if (response.ok) {
                console.log(`[KEEPALIVE] Self-ping successful to ${EXTERNAL_URL}/api/ping`);
            }
        } catch (err) {
            console.warn('[KEEPALIVE] Self-ping failed:', err.message);
        }
    }, PING_INTERVAL);
}

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
