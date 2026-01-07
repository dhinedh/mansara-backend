const express = require('express');
const router = express.Router();
const { Product, Combo } = require('../models/Product');
const { protect, admin } = require('../middleware/authMiddleware');

// ========================================
// PERFORMANCE OPTIMIZATIONS ADDED:
// 1. Increased cache duration to 10 minutes
// 2. Added .lean() to all queries
// 3. Added field projection
// 4. Optimized pagination
// 5. Added query timeouts
// ========================================

// ========================================
// ENHANCED CACHE MIDDLEWARE (10 MIN)
// ========================================
const cache = new Map();

const cacheMiddleware = (duration = 600000) => { // 10 minutes
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

const clearComboCache = () => {
    let cleared = 0;
    for (const key of cache.keys()) {
        if (key.includes('/api/combos')) {
            cache.delete(key);
            cleared++;
        }
    }
    console.log(`[CACHE] Cleared ${cleared} combo cache entries`);
};

// ========================================
// GET ALL COMBOS (OPTIMIZED WITH PAGINATION)
// ========================================
router.get('/', cacheMiddleware(600000), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;

        // OPTIMIZATION: Use Promise.all and lean()
        const [combos, total] = await Promise.all([
            Combo.find({ isActive: true })
                .select('name slug originalPrice comboPrice image images isFeatured stock')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .maxTimeMS(10000)
                .exec(),
            Combo.countDocuments({ isActive: true })
                .maxTimeMS(5000)
                .exec()
        ]);

        res.json({
            combos,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: skip + combos.length < total
            }
        });
    } catch (error) {
        console.error('[ERROR] Get combos:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET FEATURED COMBOS (OPTIMIZED)
// ========================================
router.get('/featured', cacheMiddleware(1800000), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 10, 50);
        
        // OPTIMIZATION: Use compound index { isFeatured: 1, isActive: 1 }
        const combos = await Combo.find({ 
            isFeatured: true, 
            isActive: true 
        })
            .select('name slug originalPrice comboPrice image images stock')
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean()
            .maxTimeMS(5000)
            .exec();

        res.json(combos);
    } catch (error) {
        console.error('[ERROR] Get featured combos:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET ACTIVE COMBOS (OPTIMIZED)
// ========================================
router.get('/active', cacheMiddleware(600000), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        
        const combos = await Combo.find({ isActive: true })
            .select('name slug originalPrice comboPrice image stock')
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean()
            .maxTimeMS(5000)
            .exec();

        res.json(combos);
    } catch (error) {
        console.error('[ERROR] Get active combos:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET SINGLE COMBO (OPTIMIZED)
// ========================================
router.get('/:id', cacheMiddleware(600000), async (req, res) => {
    try {
        let combo;

        // Try to find by ID first
        if (req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
            combo = await Combo.findById(req.params.id)
                .select('-__v')
                .populate('products', 'name price image stock') // Only needed product fields
                .lean()
                .maxTimeMS(5000)
                .exec();
        }

        // If not found by ID, try slug
        if (!combo) {
            combo = await Combo.findOne({ slug: req.params.id, isActive: true })
                .select('-__v')
                .populate('products', 'name price image stock')
                .lean()
                .maxTimeMS(5000)
                .exec();
        }

        if (!combo) {
            return res.status(404).json({ message: 'Combo not found' });
        }

        res.json(combo);
    } catch (error) {
        console.error('[ERROR] Get single combo:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CREATE COMBO (ADMIN)
// ========================================
router.post('/', protect, admin, async (req, res) => {
    try {
        const combo = new Combo(req.body);
        const createdCombo = await combo.save();
        
        // Clear cache after creating
        clearComboCache();
        
        res.status(201).json(createdCombo);
    } catch (error) {
        console.error('[ERROR] Create combo:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// UPDATE COMBO (ADMIN)
// ========================================
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const combo = await Combo.findByIdAndUpdate(
            req.params.id,
            req.body,
            { 
                new: true,
                runValidators: true,
                select: '-__v'
            }
        )
        .maxTimeMS(5000)
        .exec();

        if (!combo) {
            return res.status(404).json({ message: 'Combo not found' });
        }

        // Clear cache after update
        clearComboCache();

        res.json(combo);
    } catch (error) {
        console.error('[ERROR] Update combo:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// DELETE COMBO (ADMIN)
// ========================================
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const combo = await Combo.findByIdAndDelete(req.params.id)
            .maxTimeMS(5000)
            .exec();

        if (!combo) {
            return res.status(404).json({ message: 'Combo not found' });
        }

        // Clear cache after deletion
        clearComboCache();

        res.json({ message: 'Combo removed successfully' });
    } catch (error) {
        console.error('[ERROR] Delete combo:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// UPDATE COMBO STOCK (ADMIN) - OPTIMIZED
// ========================================
router.patch('/:id/stock', protect, admin, async (req, res) => {
    try {
        const { stock } = req.body;

        if (stock === undefined || stock < 0) {
            return res.status(400).json({ message: 'Valid stock quantity required' });
        }

        const result = await Combo.updateOne(
            { _id: req.params.id },
            { $set: { stock } }
        )
        .maxTimeMS(3000)
        .exec();

        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Combo not found' });
        }

        clearComboCache();

        res.json({ 
            message: 'Stock updated successfully',
            stock 
        });
    } catch (error) {
        console.error('[ERROR] Update combo stock:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// TOGGLE COMBO FEATURED STATUS (ADMIN)
// ========================================
router.patch('/:id/featured', protect, admin, async (req, res) => {
    try {
        const { isFeatured } = req.body;

        const combo = await Combo.findByIdAndUpdate(
            req.params.id,
            { $set: { isFeatured: !!isFeatured } },
            { new: true, select: '-__v' }
        )
        .maxTimeMS(3000)
        .exec();

        if (!combo) {
            return res.status(404).json({ message: 'Combo not found' });
        }

        clearComboCache();

        res.json(combo);
    } catch (error) {
        console.error('[ERROR] Toggle featured:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// TOGGLE COMBO ACTIVE STATUS (ADMIN)
// ========================================
router.patch('/:id/active', protect, admin, async (req, res) => {
    try {
        const { isActive } = req.body;

        const combo = await Combo.findByIdAndUpdate(
            req.params.id,
            { $set: { isActive: !!isActive } },
            { new: true, select: '-__v' }
        )
        .maxTimeMS(3000)
        .exec();

        if (!combo) {
            return res.status(404).json({ message: 'Combo not found' });
        }

        clearComboCache();

        res.json(combo);
    } catch (error) {
        console.error('[ERROR] Toggle active:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CLEAR COMBO CACHE (ADMIN)
// ========================================
router.post('/cache/clear', protect, admin, (req, res) => {
    try {
        clearComboCache();
        res.json({ message: 'Combo cache cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;