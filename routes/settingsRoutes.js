const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { protect, admin } = require('../middleware/authMiddleware');

// ========================================
// CACHE FOR SETTINGS (30 minutes)
// ========================================
const cache = new Map();
const CACHE_DURATION = 1800000; // 30 minutes

const clearSettingsCache = () => {
    cache.clear();
};

// ========================================
// GET SETTINGS (CACHED)
// ========================================
router.get('/', async (req, res) => {
    try {
        // Check cache first
        const cacheKey = 'site_settings';
        const cached = cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            return res.json(cached.data);
        }

        // Fetch from database
        let settings = await Setting.findOne({ key: 'site_settings' })
            .select('-__v')
            .lean()
            .exec();

        if (!settings) {
            // Return defaults if not found
            settings = {
                key: 'site_settings',
                siteName: 'Mansara Foods',
                siteDescription: 'Premium quality food products',
                contactEmail: 'info@mansarafoods.com',
                contactPhone: '',
                address: '',
                socialMedia: {
                    facebook: '',
                    instagram: '',
                    twitter: '',
                    whatsapp: ''
                },
                businessHours: {
                    monday: '9:00 AM - 6:00 PM',
                    tuesday: '9:00 AM - 6:00 PM',
                    wednesday: '9:00 AM - 6:00 PM',
                    thursday: '9:00 AM - 6:00 PM',
                    friday: '9:00 AM - 6:00 PM',
                    saturday: '9:00 AM - 2:00 PM',
                    sunday: 'Closed'
                }
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
router.put('/', protect, admin, async (req, res) => {
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
        );

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
router.patch('/:field', protect, admin, async (req, res) => {
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
        );

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
router.post('/reset', protect, admin, async (req, res) => {
    try {
        const defaultSettings = {
            key: 'site_settings',
            siteName: 'Mansara Foods',
            siteDescription: 'Premium quality food products',
            contactEmail: 'info@mansarafoods.com',
            contactPhone: '',
            address: '',
            socialMedia: {
                facebook: '',
                instagram: '',
                twitter: '',
                whatsapp: ''
            },
            businessHours: {
                monday: '9:00 AM - 6:00 PM',
                tuesday: '9:00 AM - 6:00 PM',
                wednesday: '9:00 AM - 6:00 PM',
                thursday: '9:00 AM - 6:00 PM',
                friday: '9:00 AM - 6:00 PM',
                saturday: '9:00 AM - 2:00 PM',
                sunday: 'Closed'
            }
        };

        const settings = await Setting.findOneAndUpdate(
            { key: 'site_settings' },
            defaultSettings,
            { 
                new: true, 
                upsert: true,
                select: '-__v'
            }
        );

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
router.post('/clear-cache', protect, admin, async (req, res) => {
    try {
        clearSettingsCache();
        res.json({ message: 'Settings cache cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;