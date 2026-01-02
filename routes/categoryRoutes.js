const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect, admin } = require('../middleware/authMiddleware');

// ========================================
// SIMPLE CACHE MIDDLEWARE
// ========================================
const cache = new Map();

const cacheMiddleware = (duration = 600000) => { // 10 minutes default for categories
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
            if (cache.size > 20) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            return originalJson(data);
        };
        next();
    };
};

const clearCategoryCache = () => {
    for (const key of cache.keys()) {
        if (key.includes('/api/categories')) {
            cache.delete(key);
        }
    }
};

// ========================================
// GET ALL CATEGORIES (OPTIMIZED & CACHED)
// ========================================
router.get('/', cacheMiddleware(600000), async (req, res) => {
    try {
        const categories = await Category.find({})
            .select('-__v')
            .sort({ name: 1 })
            .lean()
            .exec();
        
        res.json(categories);
    } catch (error) {
        console.error('[ERROR] Get categories:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET SINGLE CATEGORY (OPTIMIZED)
// ========================================
router.get('/:id', cacheMiddleware(600000), async (req, res) => {
    try {
        let category = await Category.findById(req.params.id)
            .select('-__v')
            .lean()
            .exec();

        if (!category) {
            category = await Category.findOne({ slug: req.params.id })
                .select('-__v')
                .lean()
                .exec();
        }

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        res.json(category);
    } catch (error) {
        if (error.kind === 'ObjectId') {
            try {
                const category = await Category.findOne({ slug: req.params.id })
                    .select('-__v')
                    .lean()
                    .exec();
                
                if (category) return res.json(category);
                return res.status(404).json({ message: 'Category not found' });
            } catch (slugError) {
                return res.status(500).json({ message: slugError.message });
            }
        }
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CREATE CATEGORY (ADMIN)
// ========================================
router.post('/', protect, admin, async (req, res) => {
    try {
        const { name, slug, description } = req.body;
        
        const categoryExists = await Category.findOne({ 
            $or: [{ name }, { slug }] 
        }).lean().exec();

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

        const category = await Category.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { 
                new: true,
                runValidators: true,
                select: '-__v'
            }
        );

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
        const category = await Category.findByIdAndDelete(req.params.id);

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

module.exports = router;