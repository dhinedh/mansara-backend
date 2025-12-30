const express = require('express');
const router = express.Router();
const { Product, Combo } = require('../models/Product');
const { protect, admin } = require('../middleware/authMiddleware');

// Get all combos
router.get('/', async (req, res) => {
    try {
        const combos = await Combo.find({});
        res.json(combos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single combo
router.get('/:id', async (req, res) => {
    try {
        const combo = await Combo.findById(req.params.id);
        if (combo) {
            res.json(combo);
        } else {
            const comboBySlug = await Combo.findOne({ slug: req.params.id });
            if (comboBySlug) return res.json(comboBySlug);
            res.status(404).json({ message: 'Combo not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a combo
router.post('/', protect, admin, async (req, res) => {
    try {
        const combo = new Combo(req.body);
        const createdCombo = await combo.save();
        res.status(201).json(createdCombo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update a combo
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const combo = await Combo.findById(req.params.id);
        if (combo) {
            Object.assign(combo, req.body);
            const updatedCombo = await combo.save();
            res.json(updatedCombo);
        } else {
            res.status(404).json({ message: 'Combo not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete a combo
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const combo = await Combo.findById(req.params.id);
        if (combo) {
            await combo.deleteOne();
            res.json({ message: 'Combo removed' });
        } else {
            res.status(404).json({ message: 'Combo not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
