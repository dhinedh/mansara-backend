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
            console.error('[CRUD GetAll] Error:', error);
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
            console.error('[CRUD GetSingle] Error:', error);
            res.status(500).json({ message: error.message });
        }
    });

    // Create (Admin)
    router.post('/', protect, admin, async (req, res) => {
        try {
            console.log('[CRUD Create] Received data:', req.body);
            console.log('[CRUD Create] User:', req.user?.email);
            
            const item = new Model(req.body);
            const savedItem = await item.save();
            
            console.log('[CRUD Create] Success:', savedItem._id);
            res.status(201).json(savedItem);
        } catch (error) {
            console.error('[CRUD Create] Error:', error);
            console.error('[CRUD Create] Error details:', error.errors);
            res.status(400).json({
                message: error.message,
                details: error.errors
            });
        }
    });

    // Update (Admin)
    router.put('/:id', protect, admin, async (req, res) => {
        try {
            console.log('[CRUD Update] ID:', req.params.id);
            console.log('[CRUD Update] Data:', req.body);
            
            // Find the document first
            const item = await Model.findById(req.params.id);
            if (!item) return res.status(404).json({ message: 'Not found' });
            
            // Update fields using Object.assign
            Object.assign(item, req.body);
            
            // Save (this triggers pre-save hooks)
            const updatedItem = await item.save();
            
            console.log('[CRUD Update] Success:', updatedItem._id);
            res.json(updatedItem);
        } catch (error) {
            console.error('[CRUD Update] Error:', error);
            console.error('[CRUD Update] Error details:', error.errors);
            res.status(400).json({
                message: error.message,
                details: error.errors
            });
        }
    });

    // Delete (Admin)
    router.delete('/:id', protect, admin, async (req, res) => {
        try {
            console.log('[CRUD Delete] ID:', req.params.id);
            
            const item = await Model.findByIdAndDelete(req.params.id);
            if (!item) return res.status(404).json({ message: 'Not found' });
            
            console.log('[CRUD Delete] Success:', req.params.id);
            res.json({ message: 'Deleted successfully' });
        } catch (error) {
            console.error('[CRUD Delete] Error:', error);
            res.status(500).json({ message: error.message });
        }
    });

    return router;
};

module.exports = createCrudRouter;