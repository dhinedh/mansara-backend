// Trigger restart: 7
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const compression = require('compression');

dotenv.config();
console.log('[DEBUG] Environment Config Loaded');

const app = express();
const PORT = process.env.PORT || 5000;

// ========================================
// PERFORMANCE OPTIMIZATIONS
// ========================================

// 1. GZIP Compression - Reduces response size by 70-90%
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// 2. Trust proxy for correct IP addresses
app.set('trust proxy', 1);

// 3. Disable x-powered-by header for security
app.disable('x-powered-by');

// Middleware
app.use(cors({
    origin: [
        'http://localhost:5173',
        'http://localhost:8080',
        'http://127.0.0.1:5173',
        'https://mansarafoods-o9z6.vercel.app',
        process.env.FRONTEND_URL
    ].filter(url => url && url !== 'undefined'),
    credentials: true,
    maxAge: 86400
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================================
// DATABASE CONNECTION WITH OPTIMIZATION
// ========================================
mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 120000, // Increased to 2 minutes
    serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
})
    .then(() => {
        console.log('✅ Connected to MongoDB');
        // Create indexes after connection and model loading
        setTimeout(() => createIndexes(), 1000);
    })
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// ========================================
// CREATE DATABASE INDEXES FOR PERFORMANCE
// ========================================
async function createIndexes() {
    try {
        // Import models INSIDE the function to ensure they're loaded
        const { Product } = require('./models/Product');
        const Order = require('./models/Order');
        const User = require('./models/User');
        const Category = require('./models/Category');

        console.log('[INFO] Creating database indexes...');

        // Helper function to safely create index
        const safeCreateIndex = async (collection, indexSpec, options = {}) => {
            try {
                const indexName = options.name || Object.keys(indexSpec).map(k => `${k}_${indexSpec[k]}`).join('_');
                const existingIndexes = await collection.getIndexes();

                if (!existingIndexes[indexName]) {
                    await collection.createIndex(indexSpec, options);
                    console.log(`  ✅ Created index: ${indexName}`);
                } else {
                    console.log(`  ℹ️ Index already exists: ${indexName}`);
                }
            } catch (err) {
                // Ignore if index already exists with different options
                if (err.code !== 85 && err.code !== 86) {
                    console.log(`  ⚠️ Could not create index: ${err.message}`);
                }
            }
        };

        // Product indexes
        if (Product && Product.collection) {
            await safeCreateIndex(Product.collection, { category: 1 });
            await safeCreateIndex(Product.collection, { isFeatured: 1 });
            await safeCreateIndex(Product.collection, { isNewArrival: 1 });
            await safeCreateIndex(Product.collection, { isOffer: 1 });
            await safeCreateIndex(Product.collection, { isActive: 1 });
            await safeCreateIndex(Product.collection, { createdAt: -1 });
            await safeCreateIndex(Product.collection, { category: 1, isActive: 1 }, { name: 'category_active' });
        }

        // Order indexes
        if (Order && Order.collection) {
            await safeCreateIndex(Order.collection, { user: 1 });
            await safeCreateIndex(Order.collection, { orderId: 1 });
            await safeCreateIndex(Order.collection, { orderStatus: 1 });
            await safeCreateIndex(Order.collection, { createdAt: -1 });
            await safeCreateIndex(Order.collection, { user: 1, createdAt: -1 }, { name: 'user_createdAt' });
        }

        // User indexes
        if (User && User.collection) {
            await safeCreateIndex(User.collection, { resetPasswordToken: 1 });
            await safeCreateIndex(User.collection, { whatsapp: 1 });
            await safeCreateIndex(User.collection, { phone: 1 });
        }

        // Category indexes
        if (Category && Category.collection) {
            await safeCreateIndex(Category.collection, { isActive: 1 });
        }

        console.log('✅ Database indexes verified/created successfully');
    } catch (error) {
        console.error('⚠️ Error managing indexes:', error.message);
        // Don't crash the server if indexes fail
    }
}

// ========================================
// SIMPLE IN-MEMORY CACHE MIDDLEWARE
// ========================================
const cache = new Map();

const cacheMiddleware = (duration) => {
    return (req, res, next) => {
        if (req.method !== 'GET') return next();

        const key = req.originalUrl;
        const cachedResponse = cache.get(key);

        if (cachedResponse && Date.now() - cachedResponse.timestamp < duration) {
            console.log(`[CACHE HIT] ${key}`);
            return res.json(cachedResponse.data);
        }

        const originalJson = res.json.bind(res);

        res.json = (data) => {
            cache.set(key, {
                data,
                timestamp: Date.now()
            });

            if (cache.size > 100) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }

            return originalJson(data);
        };

        next();
    };
};

const clearCache = (pattern) => {
    for (const key of cache.keys()) {
        if (!pattern || key.includes(pattern)) {
            cache.delete(key);
        }
    }
};

app.locals.clearCache = clearCache;

// ========================================
// ROUTES
// ========================================
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

app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Mansara Nourish Hub API is running',
        version: '2.0.0 - Optimized',
        optimizations: {
            compression: 'enabled',
            caching: 'enabled',
            indexes: 'enabled'
        }
    });
});

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.stack);
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ========================================
// GRACEFUL SHUTDOWN
// ========================================
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed');
            process.exit(0);
        });
    });
});

const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📦 GZIP compression enabled`);
    console.log(`⚡ Performance optimizations active`);
    console.log(`🔒 CORS allowed for: http://localhost:5173, http://localhost:8080, ${process.env.FRONTEND_URL}`);
});

module.exports = { app, clearCache };