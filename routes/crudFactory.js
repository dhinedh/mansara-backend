const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');

const createCrudRouter = (Model) => {
    const router = express.Router();

    // Get All (Public)
    router.get('/', async (req, res) => {
        try {
            const items = await Model.find().sort({ createdAt: -1 });
            res.json(items);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // Get Single (Public)
    router.get('/:id', async (req, res) => {
        try {
            const item = await Model.findById(req.params.id);
            if (!item) return res.status(404).json({ message: 'Not found' });
            res.json(item);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    // Create (Admin)
    router.post('/', protect, admin, async (req, res) => {
        try {
            const item = new Model(req.body);
            const savedItem = await item.save();
            res.status(201).json(savedItem);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    });

    // Update (Admin)
    router.put('/:id', protect, admin, async (req, res) => {
        try {
            const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true });
            if (!item) return res.status(404).json({ message: 'Not found' });
            res.json(item);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    });

    // Delete (Admin)
    router.delete('/:id', protect, admin, async (req, res) => {
        try {
            const item = await Model.findByIdAndDelete(req.params.id);
            if (!item) return res.status(404).json({ message: 'Not found' });
            res.json({ message: 'Deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    });

    return router;
};

module.exports = createCrudRouter;
