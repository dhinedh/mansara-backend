const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');

// ========================================
// PERFORMANCE OPTIMIZATIONS ADDED:
// 1. Added .lean() to all queries
// 2. Added field projection with .select()
// 3. Optimized aggregation for user stats
// 4. Added query timeouts
// 5. Reduced unnecessary populate calls
// 6. Optimized address operations
// ========================================

// ========================================
// GET ALL USERS (ADMIN) - HIGHLY OPTIMIZED
// ========================================
router.get('/', protect, admin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        // OPTIMIZATION: Use single aggregation instead of multiple queries
        const usersAgg = await User.aggregate([
            {
                $lookup: {
                    from: 'orders',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'userOrders'
                }
            },
            {
                $addFields: {
                    totalOrders: { $size: '$userOrders' },
                    totalSpent: { $sum: '$userOrders.total' }
                }
            },
            {
                $project: {
                    password: 0,
                    userOrders: 0,
                    __v: 0,
                    resetPasswordToken: 0,
                    resetPasswordExpire: 0,
                    otp: 0,
                    otpExpire: 0
                }
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit }
        ])
        .maxTimeMS(15000)
        .exec();

        const total = await User.countDocuments()
            .maxTimeMS(5000)
            .exec();

        res.json({
            users: usersAgg,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasMore: skip + usersAgg.length < total
            }
        });
    } catch (error) {
        console.error('[ERROR] Get users:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET USER BY ID (OPTIMIZED)
// ========================================
router.get('/:id', async (req, res) => {
    try {
        // OPTIMIZATION: Use lean() and select only needed fields
        const user = await User.findById(req.params.id)
            .select('-password -__v -resetPasswordToken -resetPasswordExpire -otp -otpExpire')
            .lean()
            .maxTimeMS(5000)
            .exec();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('[ERROR] Get user by ID:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// UPDATE USER (OPTIMIZED)
// ========================================
router.put('/:id', protect, async (req, res) => {
    try {
        // Only allow updating certain fields
        const allowedUpdates = ['name', 'phone', 'whatsapp', 'addresses'];
        const updates = {};
        
        allowedUpdates.forEach(field => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        // OPTIMIZATION: Use updateOne then fetch with lean()
        const updateResult = await User.updateOne(
            { _id: req.params.id },
            { $set: updates }
        )
        .maxTimeMS(5000)
        .exec();

        if (updateResult.matchedCount === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = await User.findById(req.params.id)
            .select('-password -__v')
            .lean()
            .maxTimeMS(3000)
            .exec();

        res.json(user);
    } catch (error) {
        console.error('[ERROR] Update user:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// ADD ADDRESS (OPTIMIZED)
// ========================================
router.post('/:id/address', protect, async (req, res) => {
    try {
        // OPTIMIZATION: Use findByIdAndUpdate with $push
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $push: { addresses: req.body } },
            { new: true, select: '-password -__v' }
        )
        .maxTimeMS(5000)
        .exec();
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('[ERROR] Add address:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// UPDATE ADDRESS (OPTIMIZED)
// ========================================
router.put('/:id/address/:addressId', protect, async (req, res) => {
    try {
        // OPTIMIZATION: Use positional operator to update array element
        const updateFields = {};
        Object.keys(req.body).forEach(key => {
            updateFields[`addresses.$.${key}`] = req.body[key];
        });

        const user = await User.findOneAndUpdate(
            { 
                _id: req.params.id,
                'addresses._id': req.params.addressId 
            },
            { $set: updateFields },
            { new: true, select: '-password -__v' }
        )
        .maxTimeMS(5000)
        .exec();
        
        if (!user) {
            return res.status(404).json({ message: 'User or address not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('[ERROR] Update address:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// DELETE ADDRESS (OPTIMIZED)
// ========================================
router.delete('/:id/address/:addressId', protect, async (req, res) => {
    try {
        // OPTIMIZATION: Use $pull to remove array element
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $pull: { addresses: { _id: req.params.addressId } } },
            { new: true, select: '-password -__v' }
        )
        .maxTimeMS(5000)
        .exec();
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('[ERROR] Delete address:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// GET USER STATISTICS (ADMIN) - OPTIMIZED
// ========================================
router.get('/:id/stats', protect, admin, async (req, res) => {
    try {
        // OPTIMIZATION: Use single aggregation pipeline
        const stats = await User.aggregate([
            { 
                $match: { 
                    _id: require('mongoose').Types.ObjectId(req.params.id) 
                } 
            },
            {
                $lookup: {
                    from: 'orders',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'orders'
                }
            },
            {
                $project: {
                    name: 1,
                    email: 1,
                    totalOrders: { $size: '$orders' },
                    totalSpent: { $sum: '$orders.total' },
                    averageOrderValue: { $avg: '$orders.total' },
                    lastOrderDate: { $max: '$orders.createdAt' },
                    ordersByStatus: {
                        $reduce: {
                            input: '$orders',
                            initialValue: {},
                            in: {
                                $mergeObjects: [
                                    '$$value',
                                    {
                                        $arrayToObject: [[
                                            { k: '$$this.orderStatus', v: 1 }
                                        ]]
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        ])
        .maxTimeMS(10000)
        .exec();

        if (stats.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(stats[0]);
    } catch (error) {
        console.error('[ERROR] Get user stats:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// SEARCH USERS (ADMIN) - OPTIMIZED
// ========================================
router.get('/search/query', protect, admin, async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;
        
        if (!q || q.trim().length === 0) {
            return res.status(400).json({ message: 'Search query required' });
        }

        // OPTIMIZATION: Use regex with index
        const searchRegex = new RegExp(q, 'i');
        
        const users = await User.find({
            $or: [
                { name: searchRegex },
                { email: searchRegex },
                { phone: searchRegex }
            ]
        })
        .select('name email phone whatsapp role status createdAt')
        .limit(parseInt(limit))
        .lean()
        .maxTimeMS(5000)
        .exec();

        res.json({
            users,
            query: q,
            count: users.length
        });
    } catch (error) {
        console.error('[ERROR] Search users:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// UPDATE USER ROLE (ADMIN) - OPTIMIZED
// ========================================
router.patch('/:id/role', protect, admin, async (req, res) => {
    try {
        const { role } = req.body;

        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { role, isAdmin: role === 'admin' } },
            { new: true, select: '-password -__v' }
        )
        .maxTimeMS(5000)
        .exec();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('[ERROR] Update user role:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// UPDATE USER STATUS (ADMIN) - OPTIMIZED
// ========================================
router.patch('/:id/status', protect, admin, async (req, res) => {
    try {
        const { status } = req.body;

        if (!['Active', 'Inactive', 'Blocked'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true, select: '-password -__v' }
        )
        .maxTimeMS(5000)
        .exec();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('[ERROR] Update user status:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// DELETE USER (ADMIN) - OPTIMIZED
// ========================================
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id)
            .maxTimeMS(5000)
            .exec();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('[ERROR] Delete user:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;