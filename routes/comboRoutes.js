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
            if (cache.size > 30) {
                const firstKey = cache.keys().next().value;
                cache.delete(firstKey);
            }
            return originalJson(data);
        };
        next();
    };
};

const clearComboCache = () => {
    for (const key of cache.keys()) {
        if (key.includes('/api/combos')) {
            cache.delete(key);
        }
    }
};

// ========================================
// GET ALL COMBOS (OPTIMIZED WITH PAGINATION)
// ========================================
router.get('/', cacheMiddleware(300000), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [combos, total] = await Promise.all([
            Combo.find({})
                .select('-__v')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Combo.countDocuments()
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
router.get('/featured', cacheMiddleware(600000), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        
        const combos = await Combo.find({ featured: true })
            .select('name slug price images featured discount')
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean()
            .exec();

        res.json(combos);
    } catch (error) {
        console.error('[ERROR] Get featured combos:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET SINGLE COMBO (OPTIMIZED)
// ========================================
router.get('/:id', cacheMiddleware(300000), async (req, res) => {
    try {
        let combo = await Combo.findById(req.params.id)
            .select('-__v')
            .lean()
            .exec();

        if (!combo) {
            combo = await Combo.findOne({ slug: req.params.id })
                .select('-__v')
                .lean()
                .exec();
        }

        if (!combo) {
            return res.status(404).json({ message: 'Combo not found' });
        }

        res.json(combo);
    } catch (error) {
        if (error.kind === 'ObjectId') {
            try {
                const combo = await Combo.findOne({ slug: req.params.id })
                    .select('-__v')
                    .lean()
                    .exec();
                
                if (combo) return res.json(combo);
                return res.status(404).json({ message: 'Combo not found' });
            } catch (slugError) {
                return res.status(500).json({ message: slugError.message });
            }
        }
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
        );

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
        const combo = await Combo.findByIdAndDelete(req.params.id);

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

module.exports = router;