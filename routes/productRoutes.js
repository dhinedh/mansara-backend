const express = require('express');
const router = express.Router();
const { Product, Combo } = require('../models/Product');
const { protect, admin } = require('../middleware/authMiddleware');

// ========================================
// ULTRA-FAST PRODUCT ROUTES
// ========================================
// Optimizations for faster create/update:
// 1. Minimal field selection on responses
// 2. No unnecessary population
// 3. Async cache clearing (non-blocking)
// 4. Skip validation on trusted updates
// 5. Immediate response with background tasks
// ========================================

// ========================================
// ENHANCED CACHE MIDDLEWARE
// ========================================
const cache = new Map();

const cacheMiddleware = (duration = 600000) => { // 10 minutes default
    return (req, res, next) => {
        if (req.method !== 'GET') return next();

        const key = req.originalUrl;
        const cached = cache.get(key);

        if (cached && Date.now() - cached.timestamp < duration) {
            console.log(`[CACHE HIT] ${key}`);
            return res.json(cached.data);
        }

        console.log(`[CACHE MISS] ${key}`);
        const originalJson = res.json.bind(res);
        res.json = (data) => {
            cache.set(key, { data, timestamp: Date.now() });
            
            if (cache.size > 100) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            
            return originalJson(data);
        };
        next();
    };
};

const clearProductCache = () => {
    // OPTIMIZATION: Clear cache asynchronously (non-blocking)
    setImmediate(() => {
        let cleared = 0;
        for (const key of cache.keys()) {
            if (key.includes('/api/products')) {
                cache.delete(key);
                cleared++;
            }
        }
        console.log(`[CACHE] Cleared ${cleared} product cache entries`);
    });
};

// ========================================
// GET ALL PRODUCTS - HIGHLY OPTIMIZED
// ========================================
router.get('/', cacheMiddleware(600000), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        const { category, search, featured, sort, inStock } = req.query;

        const query = { isActive: true };
        
        if (category) query.category = category;
        if (featured === 'true') query.isFeatured = true;
        if (inStock === 'true') query.stock = { $gt: 0 };
        
        if (search) {
            query.$text = { $search: search };
        }

        let sortOption = { createdAt: -1 };
        if (sort === 'price_asc') sortOption = { price: 1 };
        if (sort === 'price_desc') sortOption = { price: -1 };
        if (sort === 'name') sortOption = { name: 1 };
        if (sort === 'popular') sortOption = { rating: -1, numReviews: -1 };
        if (search) sortOption = { score: { $meta: 'textScore' } };

        const [products, total] = await Promise.all([
            Product.find(query)
                .select('name slug price offerPrice image images category featured rating numReviews stock isOffer weight')
                .sort(sortOption)
                .skip(skip)
                .limit(limit)
                .lean()
                .maxTimeMS(10000)
                .exec(),
            Product.countDocuments(query)
                .maxTimeMS(5000)
                .exec()
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
        console.error('[ERROR] Get all products:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET FEATURED PRODUCTS (OPTIMIZED)
// ========================================
router.get('/featured/list', cacheMiddleware(600000), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);

        const products = await Product.find({ isFeatured: true, isActive: true })
            .select('name slug price offerPrice image images rating numReviews stock')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean()
            .maxTimeMS(5000)
            .exec();

        res.json(products);
    } catch (error) {
        console.error('[ERROR] Get featured products:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET SINGLE PRODUCT (OPTIMIZED)
// ========================================
router.get('/:id', cacheMiddleware(600000), async (req, res) => {
    try {
        let product;

        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            product = await Product.findById(req.params.id)
                .select('-__v')
                .lean()
                .maxTimeMS(5000)
                .exec();
        }

        if (!product) {
            product = await Product.findOne({ slug: req.params.id, isActive: true })
                .select('-__v')
                .lean()
                .maxTimeMS(5000)
                .exec();
        }

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        console.error('[ERROR] Get single product:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET PRODUCTS BY CATEGORY (OPTIMIZED)
// ========================================
router.get('/category/:category', cacheMiddleware(600000), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            Product.find({ 
                category: req.params.category, 
                isActive: true 
            })
                .select('name slug price offerPrice image images rating numReviews stock weight')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .maxTimeMS(10000)
                .exec(),
            Product.countDocuments({ 
                category: req.params.category, 
                isActive: true 
            })
                .maxTimeMS(5000)
                .exec()
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
        console.error('[ERROR] Get products by category:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// SEARCH PRODUCTS (OPTIMIZED)
// ========================================
router.get('/search/query', cacheMiddleware(300000), async (req, res) => {
    try {
        const { q, limit = 20, page = 1 } = req.query;
        
        if (!q || q.trim().length === 0) {
            return res.status(400).json({ message: 'Search query required' });
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [products, total] = await Promise.all([
            Product.find(
                { 
                    $text: { $search: q },
                    isActive: true 
                },
                { score: { $meta: 'textScore' } }
            )
                .select('name slug price offerPrice image images rating numReviews stock')
                .sort({ score: { $meta: 'textScore' } })
                .skip(skip)
                .limit(parseInt(limit))
                .lean()
                .maxTimeMS(10000)
                .exec(),
            Product.countDocuments({ 
                $text: { $search: q },
                isActive: true 
            })
                .maxTimeMS(5000)
                .exec()
        ]);

        res.json({
            products,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        console.error('[ERROR] Search products:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET RELATED PRODUCTS (OPTIMIZED)
// ========================================
router.get('/:id/related', cacheMiddleware(600000), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 6, 20);

        const product = await Product.findById(req.params.id)
            .select('category')
            .lean()
            .maxTimeMS(3000)
            .exec();

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const relatedProducts = await Product.find({
            category: product.category,
            _id: { $ne: req.params.id },
            isActive: true
        })
            .select('name slug price offerPrice image rating numReviews stock')
            .limit(limit)
            .sort({ rating: -1, numReviews: -1 })
            .lean()
            .maxTimeMS(5000)
            .exec();

        res.json(relatedProducts);
    } catch (error) {
        console.error('[ERROR] Get related products:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CREATE PRODUCT (ADMIN) - ULTRA FAST
// ========================================
router.post('/', protect, admin, async (req, res) => {
    try {
        console.log('[PRODUCT] Creating product...');
        const startTime = Date.now();

        // Create product
        const product = new Product(req.body);
        const createdProduct = await product.save();

        // Convert to plain object and send immediately
        const result = createdProduct.toObject();
        
        // Clear cache asynchronously (non-blocking)
        clearProductCache();

        const duration = Date.now() - startTime;
        console.log(`[PRODUCT] ✓ Created in ${duration}ms`);

        res.status(201).json(result);
    } catch (error) {
        console.error('[ERROR] Create product:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// UPDATE PRODUCT (ADMIN) - ULTRA FAST
// ========================================
router.put('/:id', protect, admin, async (req, res) => {
    try {
        console.log('[PRODUCT] Updating product:', req.params.id);
        const startTime = Date.now();

        // OPTIMIZATION: Use findByIdAndUpdate with lean for speed
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            {
                new: true,           // Return updated doc
                runValidators: true, // Validate
                lean: true,          // Return plain object (faster)
                select: '-__v'       // Exclude version key
            }
        )
        .maxTimeMS(3000) // 3 second timeout
        .exec();

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Clear cache asynchronously (non-blocking)
        clearProductCache();

        const duration = Date.now() - startTime;
        console.log(`[PRODUCT] ✓ Updated in ${duration}ms`);

        // Send response immediately
        res.json(product);
    } catch (error) {
        console.error('[ERROR] Update product:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// BULK UPDATE PRODUCTS (ADMIN) - OPTIMIZED
// ========================================
router.put('/bulk/update', protect, admin, async (req, res) => {
    try {
        const { ids, updates } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'Product IDs required' });
        }

        console.log(`[PRODUCT] Bulk updating ${ids.length} products`);
        const startTime = Date.now();

        // OPTIMIZATION: Use bulkWrite for batch updates
        const result = await Product.bulkWrite(
            ids.map(id => ({
                updateOne: {
                    filter: { _id: id },
                    update: { $set: updates }
                }
            })),
            { ordered: false } // Continue on error
        );

        clearProductCache();

        const duration = Date.now() - startTime;
        console.log(`[PRODUCT] ✓ Bulk updated in ${duration}ms`);

        res.json({
            message: `${result.modifiedCount} products updated`,
            matched: result.matchedCount,
            modified: result.modifiedCount
        });
    } catch (error) {
        console.error('[ERROR] Bulk update products:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// DELETE PRODUCT (ADMIN)
// ========================================
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        console.log('[PRODUCT] Deleting product:', req.params.id);
        
        const product = await Product.findByIdAndDelete(req.params.id)
            .maxTimeMS(5000)
            .exec();

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        clearProductCache();
        console.log('[PRODUCT] ✓ Deleted');

        res.json({ message: 'Product removed successfully' });
    } catch (error) {
        console.error('[ERROR] Delete product:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// TOGGLE PRODUCT STATUS (ADMIN) - FAST
// ========================================
router.patch('/:id/toggle-status', protect, admin, async (req, res) => {
    try {
        const { field } = req.body; // isActive, isFeatured, isOffer, etc.
        
        if (!field) {
            return res.status(400).json({ message: 'Field to toggle required' });
        }

        const product = await Product.findById(req.params.id)
            .select(field)
            .maxTimeMS(3000)
            .exec();

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Toggle the boolean field
        product[field] = !product[field];
        await product.save();

        clearProductCache();

        res.json({ 
            message: `${field} toggled successfully`,
            [field]: product[field]
        });
    } catch (error) {
        console.error('[ERROR] Toggle product status:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// UPDATE STOCK (ADMIN) - FAST
// ========================================
router.patch('/:id/stock', protect, admin, async (req, res) => {
    try {
        const { stock } = req.body;

        if (stock === undefined || stock < 0) {
            return res.status(400).json({ message: 'Valid stock number required' });
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { stock },
            { new: true, lean: true, select: 'stock' }
        )
        .maxTimeMS(3000)
        .exec();

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        clearProductCache();

        res.json({ stock: product.stock });
    } catch (error) {
        console.error('[ERROR] Update stock:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;