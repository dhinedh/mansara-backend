const express = require('express');
const router = express.Router();
const { Product, Combo } = require('../models/Product');
const { protect, admin } = require('../middleware/authMiddleware');

// ========================================
// SIMPLE CACHE MIDDLEWARE
// ========================================
const cache = new Map();

const cacheMiddleware = (duration = 300000) => { // 5 minutes default
    return (req, res, next) => {
        if (req.method !== 'GET') return next();

        const key = req.originalUrl;
        const cached = cache.get(key);

        if (cached && Date.now() - cached.timestamp < duration) {
            return res.json(cached.data);
        }

        const originalJson = res.json.bind(res);
        res.json = (data) => {
            cache.set(key, { data, timestamp: Date.now() });
            if (cache.size > 50) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            return originalJson(data);
        };
        next();
    };
};

const clearProductCache = () => {
    for (const key of cache.keys()) {
        if (key.includes('/api/products')) {
            cache.delete(key);
        }
    }
};

// ========================================
// GET ALL PRODUCTS WITH PAGINATION & OPTIMIZATION
// ========================================
router.get('/', cacheMiddleware(300000), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const { category, search, featured, sort } = req.query;

        // Build query
        const query = {};
        if (category) query.category = category;
        if (featured === 'true') query.featured = true;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Build sort
        let sortOption = { createdAt: -1 }; // Default: newest first
        if (sort === 'price_asc') sortOption = { price: 1 };
        if (sort === 'price_desc') sortOption = { price: -1 };
        if (sort === 'name') sortOption = { name: 1 };

        // Execute query with lean() for better performance
        const [products, total] = await Promise.all([
            Product.find(query)
                .select('-__v') // Exclude version key
                .sort(sortOption)
                .skip(skip)
                .limit(limit)
                .lean() // Returns plain JS objects (40% faster)
                .exec(),
            Product.countDocuments(query)
        ]);

        res.json({
            products,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: skip + products.length < total
            }
        });
    } catch (error) {
        console.error('[ERROR] Get products:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET FEATURED PRODUCTS (OPTIMIZED)
// ========================================
router.get('/featured', cacheMiddleware(600000), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;

        const products = await Product.find({ featured: true })
            .select('name slug price images category featured')
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET SINGLE PRODUCT (OPTIMIZED)
// ========================================
router.get('/:id', cacheMiddleware(300000), async (req, res) => {
    try {
        // Try to find by ID first, then by slug
        let product = await Product.findById(req.params.id)
            .select('-__v')
            .lean()
            .exec();

        if (!product) {
            product = await Product.findOne({ slug: req.params.id })
                .select('-__v')
                .lean()
                .exec();
        }

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        if (error.kind === 'ObjectId') {
            // Invalid ID format, try slug
            try {
                const product = await Product.findOne({ slug: req.params.id })
                    .select('-__v')
                    .lean()
                    .exec();

                if (product) return res.json(product);
                return res.status(404).json({ message: 'Product not found' });
            } catch (slugError) {
                return res.status(500).json({ message: slugError.message });
            }
        }
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET PRODUCTS BY CATEGORY (OPTIMIZED)
// ========================================
router.get('/category/:category', cacheMiddleware(300000), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            Product.find({ category: req.params.category })
                .select('-__v')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Product.countDocuments({ category: req.params.category })
        ]);

        res.json({
            products,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CREATE PRODUCT (ADMIN)
// ========================================
router.post('/', protect, admin, async (req, res) => {
    try {
        console.log('[DEBUG] Creating product:', req.body.name);
        const product = new Product(req.body);
        console.log('[DEBUG] Product instance created, saving...');
        const createdProduct = await product.save();
        console.log('[DEBUG] Product saved:', createdProduct._id);

        // Clear cache after creating product
        clearProductCache();
        console.log('[DEBUG] Cache cleared');

        res.status(201).json(createdProduct);
    } catch (error) {
        console.error('[ERROR] Product creation failed:', error);
        console.error('[ERROR] Stack:', error.stack);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// UPDATE PRODUCT (ADMIN)
// ========================================
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true, // Return updated document
                runValidators: true // Run schema validators
            }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Clear cache after update
        clearProductCache();

        res.json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// DELETE PRODUCT (ADMIN)
// ========================================
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Clear cache after deletion
        clearProductCache();

        res.json({ message: 'Product removed successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// BULK OPERATIONS (ADMIN)
// ========================================
router.post('/bulk/update', protect, admin, async (req, res) => {
    try {
        const { ids, updates } = req.body;

        await Product.updateMany(
            { _id: { $in: ids } },
            { $set: updates }
        );

        clearProductCache();

        res.json({ message: `${ids.length} products updated successfully` });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;