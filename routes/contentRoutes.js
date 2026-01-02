const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const Banner = require('../models/Banner');
const Hero = require('../models/Hero');
const { protect, admin } = require('../middleware/authMiddleware');

// ========================================
// CACHE MIDDLEWARE FOR CONTENT
// ========================================
const cache = new Map();

const cacheMiddleware = (duration = 600000) => { // 10 minutes for content
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

const clearContentCache = () => {
    for (const key of cache.keys()) {
        if (key.includes('/api/content')) {
            cache.delete(key);
        }
    }
};

// --- CONTENT ROUTES ---

// Get all content pages (CACHED)
router.get('/pages', cacheMiddleware(600000), async (req, res) => {
    try {
        const pages = await Content.find()
            .select('-__v')
            .lean()
            .exec();
        res.json(pages);
    } catch (error) {
        console.error('[ERROR] Get content pages:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single content page by slug (CACHED)
router.get('/pages/:slug', cacheMiddleware(600000), async (req, res) => {
    try {
        const page = await Content.findOne({ slug: req.params.slug })
            .select('-__v')
            .lean()
            .exec();

        if (!page) {
            return res.status(404).json({ message: 'Page not found' });
        }

        res.json(page);
    } catch (error) {
        console.error('[ERROR] Get content page:', error);
        res.status(500).json({ message: error.message });
    }
});

// Update content page (ADMIN)
router.put('/pages/:slug', protect, admin, async (req, res) => {
    try {
        const { slug } = req.params;
        const { sections } = req.body;

        const content = await Content.findOneAndUpdate(
            { slug },
            { slug, sections },
            { new: true, upsert: true, select: '-__v' }
        );

        clearContentCache();
        res.json(content);
    } catch (error) {
        console.error('[ERROR] Update content page:', error);
        res.status(400).json({ message: error.message });
    }
});

// --- BANNER ROUTES ---

// Get all banners (CACHED)
router.get('/banners', cacheMiddleware(600000), async (req, res) => {
    try {
        const banners = await Banner.find()
            .select('-__v')
            .sort({ order: 1 })
            .lean()
            .exec();
        res.json(banners);
    } catch (error) {
        console.error('[ERROR] Get banners:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get active banners only (CACHED)
router.get('/banners/active', cacheMiddleware(600000), async (req, res) => {
    try {
        const banners = await Banner.find({ active: true })
            .select('-__v')
            .sort({ order: 1 })
            .lean()
            .exec();
        res.json(banners);
    } catch (error) {
        console.error('[ERROR] Get active banners:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create banner (ADMIN)
router.post('/banners', protect, admin, async (req, res) => {
    try {
        const banner = await Banner.create(req.body);
        clearContentCache();
        res.status(201).json(banner);
    } catch (error) {
        console.error('[ERROR] Create banner:', error);
        res.status(400).json({ message: error.message });
    }
});

// Update banner (ADMIN)
router.put('/banners/:id', protect, admin, async (req, res) => {
    try {
        const banner = await Banner.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true, select: '-__v' }
        );

        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        clearContentCache();
        res.json(banner);
    } catch (error) {
        console.error('[ERROR] Update banner:', error);
        res.status(400).json({ message: error.message });
    }
});

// Delete banner (ADMIN)
router.delete('/banners/:id', protect, admin, async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);

        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        clearContentCache();
        res.json({ message: 'Banner deleted successfully' });
    } catch (error) {
        console.error('[ERROR] Delete banner:', error);
        res.status(500).json({ message: error.message });
    }
});

// --- HERO ROUTES ---

// Get all hero configs (CACHED)
router.get('/hero', cacheMiddleware(600000), async (req, res) => {
    try {
        const heroes = await Hero.find()
            .select('-__v')
            .lean()
            .exec();

        // Convert array to object format
        const config = {};
        heroes.forEach(h => {
            config[h.key] = h.data;
        });

        res.json(config);
    } catch (error) {
        console.error('[ERROR] Get hero configs:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single hero config (CACHED)
router.get('/hero/:key', cacheMiddleware(600000), async (req, res) => {
    try {
        const hero = await Hero.findOne({ key: req.params.key })
            .select('-__v')
            .lean()
            .exec();

        if (!hero) {
            return res.status(404).json({ message: 'Hero config not found' });
        }

        res.json(hero.data);
    } catch (error) {
        console.error('[ERROR] Get hero config:', error);
        res.status(500).json({ message: error.message });
    }
});

// Update hero config (ADMIN)
router.put('/hero/:key', protect, admin, async (req, res) => {
    try {
        const { key } = req.params;
        const hero = await Hero.findOneAndUpdate(
            { key },
            { key, data: req.body },
            { new: true, upsert: true, select: '-__v' }
        );

        clearContentCache();
        res.json(hero);
    } catch (error) {
        console.error('[ERROR] Update hero config:', error);
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;