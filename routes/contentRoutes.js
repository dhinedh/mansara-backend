const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const Banner = require('../models/Banner');
const Hero = require('../models/Hero');
const { protect, admin, checkPermission } = require('../middleware/authMiddleware');

// ========================================
// PERFORMANCE OPTIMIZATIONS ADDED:
// 1. Increased cache to 30 minutes (content rarely changes)
// 2. Added .lean() to all queries
// 3. Added field projection
// 4. Optimized cache clearing
// 5. Added query timeouts
// ========================================

// ========================================
// CACHE MIDDLEWARE FOR CONTENT (30 MINUTES)
// ========================================
const cache = new Map();

const cacheMiddleware = (duration = 1800000) => { // 30 minutes
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

const clearContentCache = () => {
    let cleared = 0;
    for (const key of cache.keys()) {
        if (key.includes('/api/content')) {
            cache.delete(key);
            cleared++;
        }
    }
    console.log(`[CACHE] Cleared ${cleared} content cache entries`);
};

// ========================================
// CONTENT ROUTES
// ========================================

// Get all content pages (CACHED)
router.get('/pages', cacheMiddleware(1800000), async (req, res) => {
    try {
        const pages = await Content.find({ isPublished: true })
            .select('slug sections isPublished')
            .lean()
            .maxTimeMS(5000)
            .exec();
        res.json(pages);
    } catch (error) {
        console.error('[ERROR] Get content pages:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get single content page by slug (CACHED)
router.get('/pages/:slug', cacheMiddleware(1800000), async (req, res) => {
    try {
        const page = await Content.findOne({
            slug: req.params.slug,
            isPublished: true
        })
            .select('-__v')
            .lean()
            .maxTimeMS(5000)
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
router.put('/pages/:slug', protect, checkPermission('content', 'limited'), async (req, res) => {
    try {
        const { slug } = req.params;
        const { sections, isPublished } = req.body;

        const updateData = { slug, sections };
        if (isPublished !== undefined) updateData.isPublished = isPublished;

        const content = await Content.findOneAndUpdate(
            { slug },
            updateData,
            {
                new: true,
                upsert: true,
                select: '-__v',
                runValidators: true
            }
        )
            .maxTimeMS(5000)
            .exec();

        clearContentCache();
        res.json(content);
    } catch (error) {
        console.error('[ERROR] Update content page:', error);
        res.status(400).json({ message: error.message });
    }
});

// Delete content page (ADMIN)
router.delete('/pages/:slug', protect, checkPermission('content', 'full'), async (req, res) => {
    try {
        const page = await Content.findOneAndDelete({ slug: req.params.slug })
            .maxTimeMS(5000)
            .exec();

        if (!page) {
            return res.status(404).json({ message: 'Page not found' });
        }

        clearContentCache();
        res.json({ message: 'Page deleted successfully' });
    } catch (error) {
        console.error('[ERROR] Delete content page:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// BANNER ROUTES
// ========================================

// Get all banners (CACHED)
router.get('/banners', cacheMiddleware(1800000), async (req, res) => {
    try {
        const banners = await Banner.find({})
            .select('-__v')
            .sort({ order: 1 })
            .lean()
            .maxTimeMS(5000)
            .exec();
        res.json(banners);
    } catch (error) {
        console.error('[ERROR] Get banners:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get active banners only (CACHED)
router.get('/banners/active', cacheMiddleware(1800000), async (req, res) => {
    try {
        const { page } = req.query;

        const query = { active: true };
        if (page) query.page = page;

        const banners = await Banner.find(query)
            .select('page image title subtitle link order')
            .sort({ order: 1 })
            .lean()
            .maxTimeMS(5000)
            .exec();
        res.json(banners);
    } catch (error) {
        console.error('[ERROR] Get active banners:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get banners by page (CACHED)
router.get('/banners/page/:page', cacheMiddleware(1800000), async (req, res) => {
    try {
        const banners = await Banner.find({
            page: req.params.page,
            active: true
        })
            .select('image title subtitle link order')
            .sort({ order: 1 })
            .lean()
            .maxTimeMS(5000)
            .exec();
        res.json(banners);
    } catch (error) {
        console.error('[ERROR] Get banners by page:', error);
        res.status(500).json({ message: error.message });
    }
});

// Create banner (ADMIN)
router.post('/banners', protect, checkPermission('banners', 'limited'), async (req, res) => {
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
router.put('/banners/:id', protect, checkPermission('banners', 'limited'), async (req, res) => {
    try {
        const banner = await Banner.findByIdAndUpdate(
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
router.delete('/banners/:id', protect, checkPermission('banners', 'full'), async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id)
            .maxTimeMS(5000)
            .exec();

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

// Toggle banner active status (ADMIN)
router.patch('/banners/:id/active', protect, checkPermission('banners', 'limited'), async (req, res) => {
    try {
        const { active } = req.body;

        const banner = await Banner.findByIdAndUpdate(
            req.params.id,
            { $set: { active: !!active } },
            { new: true, select: '-__v' }
        )
            .maxTimeMS(3000)
            .exec();

        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }

        clearContentCache();
        res.json(banner);
    } catch (error) {
        console.error('[ERROR] Toggle banner active:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// HERO ROUTES
// ========================================

// Get all hero configs (CACHED)
router.get('/hero', cacheMiddleware(1800000), async (req, res) => {
    try {
        const heroes = await Hero.find({ isActive: true })
            .select('key data')
            .lean()
            .maxTimeMS(5000)
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
router.get('/hero/:key', cacheMiddleware(1800000), async (req, res) => {
    try {
        const hero = await Hero.findOne({
            key: req.params.key,
            isActive: true
        })
            .select('data')
            .lean()
            .maxTimeMS(5000)
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
router.put('/hero/:key', protect, checkPermission('banners', 'limited'), async (req, res) => {
    try {
        const { key } = req.params;
        const hero = await Hero.findOneAndUpdate(
            { key },
            {
                key,
                data: req.body,
                isActive: true
            },
            {
                new: true,
                upsert: true,
                select: '-__v'
            }
        )
            .maxTimeMS(5000)
            .exec();

        clearContentCache();
        res.json(hero);
    } catch (error) {
        console.error('[ERROR] Update hero config:', error);
        res.status(400).json({ message: error.message });
    }
});

// Delete hero config (ADMIN)
router.delete('/hero/:key', protect, checkPermission('banners', 'full'), async (req, res) => {
    try {
        const hero = await Hero.findOneAndDelete({ key: req.params.key })
            .maxTimeMS(5000)
            .exec();

        if (!hero) {
            return res.status(404).json({ message: 'Hero config not found' });
        }

        clearContentCache();
        res.json({ message: 'Hero config deleted successfully' });
    } catch (error) {
        console.error('[ERROR] Delete hero config:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CLEAR CONTENT CACHE (ADMIN)
// ========================================
router.post('/cache/clear', protect, checkPermission('content', 'limited'), (req, res) => {
    try {
        clearContentCache();
        res.json({ message: 'Content cache cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;