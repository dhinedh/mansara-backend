const express = require('express');
const router = express.Router();
const Content = require('../models/Content');
const Banner = require('../models/Banner');
const Hero = require('../models/Hero');

// --- Content Routes ---

// Get all content pages
router.get('/pages', async (req, res) => {
    try {
        const pages = await Content.find();
        res.json(pages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update content page
router.put('/pages/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const { sections } = req.body;

        const content = await Content.findOneAndUpdate(
            { slug },
            { slug, sections },
            { new: true, upsert: true }
        );
        res.json(content);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// --- Banner Routes ---

// Get all banners
router.get('/banners', async (req, res) => {
    try {
        const banners = await Banner.find();
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create banner
router.post('/banners', async (req, res) => {
    try {
        const banner = new Banner(req.body);
        const savedBanner = await banner.save();
        res.status(201).json(savedBanner);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update banner
router.put('/banners/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const banner = await Banner.findByIdAndUpdate(id, req.body, { new: true });
        res.json(banner);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete banner
router.delete('/banners/:id', async (req, res) => {
    try {
        await Banner.findByIdAndDelete(req.params.id);
        res.json({ message: 'Banner deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- Hero Routes ---

// Get all hero configs
router.get('/hero', async (req, res) => {
    try {
        const heroes = await Hero.find();
        // Convert array to object format used by frontend
        const config = {};
        heroes.forEach(h => {
            config[h.key] = h.data;
        });
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update hero config
router.put('/hero/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const hero = await Hero.findOneAndUpdate(
            { key },
            { key, data: req.body },
            { new: true, upsert: true }
        );
        res.json(hero);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
