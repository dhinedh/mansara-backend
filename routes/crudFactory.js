const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// ========================================
// OPTIMIZED CRUD FACTORY
// ========================================
// PERFORMANCE OPTIMIZATIONS ADDED:
// 1. Added .lean() to all GET operations
// 2. Added field projection with .select()
// 3. Added query timeouts
// 4. Better error handling
// 5. Optimized slug lookups
// 6. Added pagination support
// ========================================

const createCrudRouter = (Model) => {
    const router = express.Router();

    // ========================================
    // GET ALL (PUBLIC) - OPTIMIZED WITH PAGINATION
    // ========================================
    router.get('/', async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = Math.min(parseInt(req.query.limit) || 50, 100);
            const skip = (page - 1) * limit;

            // Build query
            const query = {};
            
            // Filter by published status if field exists
            if (Model.schema.path('isPublished')) {
                query.isPublished = req.query.published === 'false' ? false : true;
            }

            // Filter by active status if field exists
            if (Model.schema.path('isActive')) {
                query.isActive = req.query.active === 'false' ? false : true;
            }

            // OPTIMIZATION: Use Promise.all for parallel queries
            const [items, total] = await Promise.all([
                Model.find(query)
                    .select('-__v')
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .lean()
                    .maxTimeMS(10000)
                    .exec(),
                Model.countDocuments(query)
                    .maxTimeMS(5000)
                    .exec()
            ]);

            res.json({
                items,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                    hasMore: skip + items.length < total
                }
            });
        } catch (error) {
            console.error('[CRUD GetAll] Error:', error);
            res.status(500).json({ message: error.message });
        }
    });

    // ========================================
    // GET SINGLE (PUBLIC) - OPTIMIZED
    // ========================================
    router.get('/:id', async (req, res) => {
        try {
            const { id } = req.params;
            let item;

            // OPTIMIZATION: Check if valid ObjectId first
            if (id.match(/^[0-9a-fA-F]{24}$/)) {
                item = await Model.findById(id)
                    .select('-__v')
                    .lean()
                    .maxTimeMS(5000)
                    .exec();
            }

            // If not found by ID or not an ID, try finding by slug
            if (!item) {
                try {
                    if (Model.schema && Model.schema.path('slug')) {
                        item = await Model.findOne({ slug: id })
                            .select('-__v')
                            .lean()
                            .maxTimeMS(5000)
                            .exec();
                    }
                } catch (slugError) {
                    console.error('[CRUD GetSingle] Slug lookup failed:', slugError.message);
                }
            }

            if (!item) {
                return res.status(404).json({ message: 'Not found' });
            }

            res.json(item);
        } catch (error) {
            console.error('[CRUD GetSingle] Error:', error);
            res.status(500).json({ message: error.message });
        }
    });

    // ========================================
    // SEARCH (PUBLIC) - OPTIMIZED
    // ========================================
    router.get('/search/query', async (req, res) => {
        try {
            const { q, limit = 20 } = req.query;

            if (!q || q.trim().length === 0) {
                return res.status(400).json({ message: 'Search query required' });
            }

            // Build search query based on schema
            const searchFields = [];
            if (Model.schema.path('title')) searchFields.push('title');
            if (Model.schema.path('name')) searchFields.push('name');
            if (Model.schema.path('content')) searchFields.push('content');
            if (Model.schema.path('description')) searchFields.push('description');

            if (searchFields.length === 0) {
                return res.status(400).json({ message: 'Search not supported for this resource' });
            }

            const searchRegex = new RegExp(q, 'i');
            const searchQuery = {
                $or: searchFields.map(field => ({ [field]: searchRegex }))
            };

            const items = await Model.find(searchQuery)
                .select('-__v -content') // Exclude large fields
                .limit(parseInt(limit))
                .lean()
                .maxTimeMS(5000)
                .exec();

            res.json({
                items,
                query: q,
                count: items.length
            });
        } catch (error) {
            console.error('[CRUD Search] Error:', error);
            res.status(500).json({ message: error.message });
        }
    });

    // ========================================
    // CREATE (ADMIN) - OPTIMIZED
    // ========================================
    router.post('/', protect, admin, async (req, res) => {
        try {
            console.log('[CRUD Create] Received data:', Object.keys(req.body));
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

    // ========================================
    // UPDATE (ADMIN) - OPTIMIZED
    // ========================================
    router.put('/:id', protect, admin, async (req, res) => {
        try {
            console.log('[CRUD Update] ID:', req.params.id);
            console.log('[CRUD Update] Fields:', Object.keys(req.body));

            // OPTIMIZATION: Use findByIdAndUpdate for better performance
            const updatedItem = await Model.findByIdAndUpdate(
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

            if (!updatedItem) {
                return res.status(404).json({ message: 'Not found' });
            }

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

    // ========================================
    // PATCH (ADMIN) - OPTIMIZED FOR PARTIAL UPDATES
    // ========================================
    router.patch('/:id', protect, admin, async (req, res) => {
        try {
            console.log('[CRUD Patch] ID:', req.params.id);
            console.log('[CRUD Patch] Fields:', Object.keys(req.body));

            const updatedItem = await Model.findByIdAndUpdate(
                req.params.id,
                { $set: req.body },
                { 
                    new: true,
                    runValidators: true,
                    select: '-__v'
                }
            )
            .maxTimeMS(5000)
            .exec();

            if (!updatedItem) {
                return res.status(404).json({ message: 'Not found' });
            }

            console.log('[CRUD Patch] Success:', updatedItem._id);
            res.json(updatedItem);
        } catch (error) {
            console.error('[CRUD Patch] Error:', error);
            res.status(400).json({
                message: error.message,
                details: error.errors
            });
        }
    });

    // ========================================
    // DELETE (ADMIN) - OPTIMIZED
    // ========================================
    router.delete('/:id', protect, admin, async (req, res) => {
        try {
            console.log('[CRUD Delete] ID:', req.params.id);

            const item = await Model.findByIdAndDelete(req.params.id)
                .maxTimeMS(5000)
                .exec();

            if (!item) {
                return res.status(404).json({ message: 'Not found' });
            }

            console.log('[CRUD Delete] Success:', req.params.id);
            res.json({ message: 'Deleted successfully' });
        } catch (error) {
            console.error('[CRUD Delete] Error:', error);
            res.status(500).json({ message: error.message });
        }
    });

    // ========================================
    // BULK DELETE (ADMIN) - OPTIMIZED
    // ========================================
    router.post('/bulk/delete', protect, admin, async (req, res) => {
        try {
            const { ids } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: 'IDs array required' });
            }

            const result = await Model.deleteMany({ _id: { $in: ids } })
                .maxTimeMS(10000)
                .exec();

            res.json({ 
                message: `${result.deletedCount} items deleted successfully`,
                deletedCount: result.deletedCount
            });
        } catch (error) {
            console.error('[CRUD BulkDelete] Error:', error);
            res.status(500).json({ message: error.message });
        }
    });

    // ========================================
    // BULK UPDATE (ADMIN) - OPTIMIZED
    // ========================================
    router.post('/bulk/update', protect, admin, async (req, res) => {
        try {
            const { ids, updates } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ message: 'IDs array required' });
            }

            if (!updates || typeof updates !== 'object') {
                return res.status(400).json({ message: 'Updates object required' });
            }

            const result = await Model.updateMany(
                { _id: { $in: ids } },
                { $set: updates }
            )
            .maxTimeMS(10000)
            .exec();

            res.json({ 
                message: `${result.modifiedCount} items updated successfully`,
                modifiedCount: result.modifiedCount,
                matchedCount: result.matchedCount
            });
        } catch (error) {
            console.error('[CRUD BulkUpdate] Error:', error);
            res.status(500).json({ message: error.message });
        }
    });

    return router;
};

module.exports = createCrudRouter;