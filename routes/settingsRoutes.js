const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { protect, admin, checkPermission } = require('../middleware/authMiddleware');

// ========================================
// PERFORMANCE OPTIMIZATIONS ADDED:
// 1. Increased cache to 1 hour (settings rarely change)
// 2. Added .lean() to queries
// 3. Optimized cache clearing
// 4. Added query timeouts
// 5. Better default handling
// ========================================

// ========================================
// CACHE FOR SETTINGS (1 HOUR)
// ========================================
const cache = new Map();
const CACHE_DURATION = 3600000; // 1 hour

const clearSettingsCache = () => {
    cache.clear();
    console.log('[CACHE] Settings cache cleared');
};

// ========================================
// GET SETTINGS (HIGHLY CACHED)
// ========================================
router.get('/', async (req, res) => {
    try {
        // Check cache first
        const cacheKey = 'site_settings';
        const cached = cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log('[CACHE HIT] Settings');
            return res.json(cached.data);
        }

        console.log('[CACHE MISS] Settings');

        // Fetch from database with lean()
        let settings = await Setting.findOne({ key: 'site_settings' })
            .select('-__v')
            .lean()
            .maxTimeMS(5000)
            .exec();

        if (!settings) {
            // Return comprehensive defaults if not found
            settings = {
                key: 'site_settings',
                website_name: 'MANSARA Foods',
                contact_email: 'contact@mansarafoods.com',
                phone_number: '',
                address: '',
                facebook_url: '',
                instagram_url: '',
                twitter_url: '',
                whatsapp_number: '',
                currency: 'INR',
                timezone: 'Asia/Kolkata',
                metaDescription: 'Premium quality food products',
                metaKeywords: [],
                freeShippingThreshold: 0,
                defaultShippingCharge: 0
            };
        }

        // Cache the result
        cache.set(cacheKey, {
            data: settings,
            timestamp: Date.now()
        });

        res.json(settings);
    } catch (error) {
        console.error('[ERROR] Get settings:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// UPDATE SETTINGS (ADMIN)
// ========================================
router.put('/', protect, checkPermission('settings', 'limited'), async (req, res) => {
    try {
        const settings = await Setting.findOneAndUpdate(
            { key: 'site_settings' },
            { ...req.body, key: 'site_settings' },
            {
                new: true,
                upsert: true,
                runValidators: true,
                select: '-__v'
            }
        )
            .maxTimeMS(5000)
            .exec();

        // Clear cache after update
        clearSettingsCache();

        res.json(settings);
    } catch (error) {
        console.error('[ERROR] Update settings:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// UPDATE SPECIFIC SETTING FIELD (ADMIN)
// ========================================
router.patch('/:field', protect, checkPermission('settings', 'limited'), async (req, res) => {
    try {
        const { field } = req.params;
        const { value } = req.body;

        const updateQuery = { $set: {} };
        updateQuery.$set[field] = value;

        const settings = await Setting.findOneAndUpdate(
            { key: 'site_settings' },
            updateQuery,
            {
                new: true,
                upsert: true,
                select: '-__v'
            }
        )
            .maxTimeMS(5000)
            .exec();

        // Clear cache after update
        clearSettingsCache();

        res.json(settings);
    } catch (error) {
        console.error('[ERROR] Update setting field:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// RESET SETTINGS TO DEFAULTS (ADMIN)
// ========================================
router.post('/reset', protect, checkPermission('settings', 'full'), async (req, res) => {
    try {
        const defaultSettings = {
            key: 'site_settings',
            website_name: 'MANSARA Foods',
            contact_email: 'contact@mansarafoods.com',
            phone_number: '',
            address: '',
            facebook_url: '',
            instagram_url: '',
            twitter_url: '',
            whatsapp_number: '',
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            metaDescription: 'Premium quality food products',
            metaKeywords: [],
            freeShippingThreshold: 0,
            defaultShippingCharge: 0
        };

        const settings = await Setting.findOneAndUpdate(
            { key: 'site_settings' },
            defaultSettings,
            {
                new: true,
                upsert: true,
                select: '-__v'
            }
        )
            .maxTimeMS(5000)
            .exec();

        // Clear cache after reset
        clearSettingsCache();

        res.json(settings);
    } catch (error) {
        console.error('[ERROR] Reset settings:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CLEAR SETTINGS CACHE (ADMIN)
// ========================================
router.post('/clear-cache', protect, checkPermission('settings', 'limited'), async (req, res) => {
    try {
        clearSettingsCache();
        res.json({ message: 'Settings cache cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET CACHE STATUS (ADMIN)
// ========================================
router.get('/cache/status', protect, checkPermission('settings', 'view'), (req, res) => {
    const cacheInfo = {
        size: cache.size,
        entries: Array.from(cache.keys()).map(key => ({
            key,
            age: Math.round((Date.now() - cache.get(key).timestamp) / 1000) + 's',
            expiresIn: Math.max(0, Math.round((CACHE_DURATION - (Date.now() - cache.get(key).timestamp)) / 1000)) + 's'
        }))
    };

    res.json(cacheInfo);
});

module.exports = router;