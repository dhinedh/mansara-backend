const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { protect, admin } = require('../middleware/authMiddleware');

// Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find({}).sort({ name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single category
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (category) {
            res.json(category);
        } else {
            const categoryBySlug = await Category.findOne({ slug: req.params.id });
            if (categoryBySlug) return res.json(categoryBySlug);
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create category
router.post('/', protect, admin, async (req, res) => {
    try {
        const { name, slug, description } = req.body;
        const categoryExists = await Category.findOne({ $or: [{ name }, { slug }] });

        if (categoryExists) {
            return res.status(400).json({ message: 'Category already exists' });
        }

        const category = await Category.create({
            name,
            slug,
            description
        });

        res.status(201).json(category);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update category
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (category) {
            category.name = req.body.name || category.name;
            category.slug = req.body.slug || category.slug;
            category.description = req.body.description || category.description;

            const updatedCategory = await category.save();
            res.json(updatedCategory);
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete category
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);

        if (category) {
            await category.deleteOne();
            res.json({ message: 'Category removed' });
        } else {
            res.status(404).json({ message: 'Category not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
