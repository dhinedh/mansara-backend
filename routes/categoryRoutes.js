const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect, admin, checkPermission } = require('../middleware/authMiddleware');

// ========================================
// CATEGORY ROUTES - FIXED VERSION
// ========================================
// Fixes:
// 1. Better error handling
// 2. Proper middleware chain
// 3. Validation before processing
// ========================================

// ========================================
// ENHANCED CACHE MIDDLEWARE
// ========================================
const cache = new Map();

const cacheMiddleware = (duration = 1800000) => {
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
// GET ALL CATEGORIES
// ========================================
router.get('/', cacheMiddleware(1800000), async (req, res) => {
    try {
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
// GET ACTIVE CATEGORIES ONLY
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
// GET SINGLE CATEGORY
// ========================================
router.get('/:id', cacheMiddleware(1800000), async (req, res) => {
    try {
        let category;

        // Try by ID first
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            category = await Category.findById(req.params.id)
                .select('name slug description isActive productCount')
                .lean()
                .maxTimeMS(3000)
                .exec();
        }

        // If not found by ID, try by slug
        if (!category) {
            category = await Category.findOne({ slug: req.params.id })
                .select('name slug description isActive productCount')
                .lean()
                .maxTimeMS(3000)
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
// CREATE CATEGORY (ADMIN) - FIXED
// ========================================
router.post('/', protect, checkPermission('categories', 'limited'), async (req, res, next) => {
    try {
        console.log('[CATEGORY] Create request:', req.body);

        const { name, slug, description } = req.body;

        // Validation
        if (!name || !slug) {
            return res.status(400).json({
                message: 'Name and slug are required'
            });
        }

        // Check if category exists
        const categoryExists = await Category.findOne({
            $or: [{ name }, { slug }]
        })
            .select('_id name slug')
            .lean()
            .maxTimeMS(3000)
            .exec();

        if (categoryExists) {
            return res.status(400).json({
                message: `Category already exists with ${categoryExists.name === name ? 'name' : 'slug'}: ${categoryExists.name === name ? name : slug}`
            });
        }

        // Create category
        const category = await Category.create({
            name,
            slug,
            description: description || ''
        });

        console.log('[CATEGORY] Created:', category);

        // Clear cache
        clearCategoryCache();

        res.status(201).json(category);
    } catch (error) {
        console.error('[ERROR] Create category:', error);
        console.error(error.stack);

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                message: 'Validation failed',
                errors
            });
        }

        // Handle duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                message: `Category with this ${field} already exists`
            });
        }

        res.status(400).json({ message: error.message });
    }
});

// ========================================
// UPDATE CATEGORY (ADMIN) - FIXED
// ========================================
router.put('/:id', protect, checkPermission('categories', 'limited'), async (req, res, next) => {
    try {
        console.log('[CATEGORY] Update request:', req.params.id, req.body);

        const updateData = {};
        if (req.body.name !== undefined) updateData.name = req.body.name;
        if (req.body.slug !== undefined) updateData.slug = req.body.slug;
        if (req.body.description !== undefined) updateData.description = req.body.description;
        if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

        // Check if updating to existing name/slug
        if (updateData.name || updateData.slug) {
            const existingCategory = await Category.findOne({
                _id: { $ne: req.params.id },
                $or: [
                    updateData.name ? { name: updateData.name } : {},
                    updateData.slug ? { slug: updateData.slug } : {}
                ].filter(obj => Object.keys(obj).length > 0)
            })
                .select('_id')
                .lean()
                .maxTimeMS(3000)
                .exec();

            if (existingCategory) {
                return res.status(400).json({
                    message: 'Another category with this name or slug already exists'
                });
            }
        }

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            updateData,
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

        console.log('[CATEGORY] Updated:', category);

        // Clear cache
        clearCategoryCache();

        res.json(category);
    } catch (error) {
        console.error('[ERROR] Update category:', error);

        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({
                message: 'Validation failed',
                errors
            });
        }

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                message: `Category with this ${field} already exists`
            });
        }

        res.status(400).json({ message: error.message });
    }
});

// ========================================
// DELETE CATEGORY (ADMIN) - FIXED
// ========================================
router.delete('/:id', protect, checkPermission('categories', 'full'), async (req, res, next) => {
    try {
        console.log('[CATEGORY] Delete request:', req.params.id);

        const category = await Category.findByIdAndDelete(req.params.id)
            .maxTimeMS(5000)
            .exec();

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        console.log('[CATEGORY] Deleted:', category.name);

        // Clear cache
        clearCategoryCache();

        res.json({
            message: 'Category deleted successfully',
            category: {
                id: category._id,
                name: category.name
            }
        });
    } catch (error) {
        console.error('[ERROR] Delete category:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET CATEGORIES WITH PRODUCT COUNT
// ========================================
router.get('/stats/count', protect, checkPermission('categories', 'view'), async (req, res) => {
    try {
        const { Product } = require('../models/Product');

        const categoriesWithCount = await Category.aggregate([
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: 'category',
                    as: 'products'
                }
            },
            {
                $project: {
                    name: 1,
                    slug: 1,
                    description: 1,
                    isActive: 1,
                    productCount: { $size: '$products' }
                }
            },
            {
                $sort: { name: 1 }
            }
        ])
            .maxTimeMS(10000)
            .exec();

        res.json(categoriesWithCount);
    } catch (error) {
        console.error('[ERROR] Get categories with count:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;