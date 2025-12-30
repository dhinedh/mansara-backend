const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// Get settings
router.get('/', async (req, res) => {
    try {
        let settings = await Setting.findOne({ key: 'site_settings' });
        if (!settings) {
            // Return defaults if not found, but don't save yet
            settings = new Setting({ key: 'site_settings' });
        }
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update settings
router.put('/', async (req, res) => {
    try {
        const settings = await Setting.findOneAndUpdate(
            { key: 'site_settings' },
            { ...req.body, key: 'site_settings' },
            { new: true, upsert: true }
        );
        res.json(settings);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
