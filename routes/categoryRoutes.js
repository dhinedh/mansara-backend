const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect, admin } = require('../middleware/authMiddleware');

// ========================================
// PERFORMANCE OPTIMIZATIONS ADDED:
// 1. Increased cache duration to 30 minutes (categories rarely change)
// 2. Added .lean() to all queries
// 3. Added field projection
// 4. Optimized cache clearing
// 5. Added query timeouts
// ========================================

// ========================================
// ENHANCED CACHE MIDDLEWARE (30 MIN FOR CATEGORIES)
// ========================================
const cache = new Map();

const cacheMiddleware = (duration = 1800000) => { // 30 minutes default
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
            if (cache.size > 50) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            return originalJson(data);
        };
        next();
    };
};

const clearCategoryCache = () => {
    let cleared = 0;
    for (const key of cache.keys()) {
        if (key.includes('/api/categories')) {
            cache.delete(key);
            cleared++;
        }
    }
    console.log(`[CACHE] Cleared ${cleared} category cache entries`);
};

// ========================================
// GET ALL CATEGORIES (OPTIMIZED & CACHED)
// ========================================
router.get('/', cacheMiddleware(1800000), async (req, res) => {
    try {
        // OPTIMIZATION: Use lean() and select only needed fields
        const categories = await Category.find({})
            .select('name slug description isActive productCount')
            .sort({ name: 1 })
            .lean()
            .maxTimeMS(5000)
            .exec();
        
        res.json(categories);
    } catch (error) {
        console.error('[ERROR] Get categories:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET ACTIVE CATEGORIES ONLY (OPTIMIZED)
// ========================================
router.get('/active', cacheMiddleware(1800000), async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true })
            .select('name slug description productCount')
            .sort({ name: 1 })
            .lean()
            .maxTimeMS(5000)
            .exec();
        
        res.json(categories);
    } catch (error) {
        console.error('[ERROR] Get active categories:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET SINGLE CATEGORY (OPTIMIZED)
// ========================================
router.get('/:id', cacheMiddleware(1800000), async (req, res) => {
    try {
        let category;

        // Try to find by ID first (if valid ObjectId)
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            category = await Category.findById(req.params.id)
                .select('-__v')
                .lean()
                .maxTimeMS(5000)
                .exec();
        }

        // If not found by ID, try slug
        if (!category) {
            category = await Category.findOne({ slug: req.params.id })
                .select('-__v')
                .lean()
                .maxTimeMS(5000)
                .exec();
        }

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json(category);
    } catch (error) {
        console.error('[ERROR] Get single category:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CREATE CATEGORY (ADMIN)
// ========================================
router.post('/', protect, admin, async (req, res) => {
    try {
        const { name, slug, description } = req.body;
        
        // Check if category exists
        const categoryExists = await Category.findOne({ 
            $or: [{ name }, { slug }] 
        })
        .select('_id')
        .lean()
        .maxTimeMS(3000)
        .exec();

        if (categoryExists) {
            return res.status(400).json({ message: 'Category already exists' });
        }

        const category = await Category.create({
            name,
            slug,
            description
        });

        // Clear cache after creating
        clearCategoryCache();

        res.status(201).json(category);
    } catch (error) {
        console.error('[ERROR] Create category:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// UPDATE CATEGORY (ADMIN)
// ========================================
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const updateData = {};
        if (req.body.name) updateData.name = req.body.name;
        if (req.body.slug) updateData.slug = req.body.slug;
        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { 
                new: true,
                runValidators: true,
                select: '-__v'
            }
        )
        .maxTimeMS(5000)
        .exec();

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Clear cache after update
        clearCategoryCache();

        res.json(category);
    } catch (error) {
        console.error('[ERROR] Update category:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// DELETE CATEGORY (ADMIN)
// ========================================
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id)
            .maxTimeMS(5000)
            .exec();

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Clear cache after deletion
        clearCategoryCache();

        res.json({ message: 'Category removed successfully' });
    } catch (error) {
        console.error('[ERROR] Delete category:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// UPDATE CATEGORY PRODUCT COUNT (INTERNAL)
// ========================================
router.patch('/:id/product-count', protect, admin, async (req, res) => {
    try {
        const { count } = req.body;

        if (count === undefined || count < 0) {
            return res.status(400).json({ message: 'Valid count required' });
        }

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { $set: { productCount: count } },
            { new: true, select: '-__v' }
        )
        .maxTimeMS(3000)
        .exec();

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        // Clear cache
        clearCategoryCache();

        res.json(category);
    } catch (error) {
        console.error('[ERROR] Update product count:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CLEAR CATEGORY CACHE (ADMIN)
// ========================================
router.post('/cache/clear', protect, admin, (req, res) => {
    try {
        clearCategoryCache();
        res.json({ message: 'Category cache cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;