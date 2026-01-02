const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');

// ========================================
// GET ALL USERS (ADMIN) - OPTIMIZED AGGREGATION
// ========================================
router.get('/', protect, admin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Use aggregation for better performance
        const [users, total] = await Promise.all([
            User.aggregate([
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
                        resetPasswordExpire: 0
                    }
                },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit }
            ]),
            User.countDocuments()
        ]);

        res.json({
            users,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
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
        const user = await User.findById(req.params.id)
            .select('-password -__v -resetPasswordToken -resetPasswordExpire')
            .lean()
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

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            { 
                new: true,
                runValidators: true,
                select: '-password -__v'
            }
        ).lean().exec();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

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
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.addresses.push(req.body);
        await user.save();

        // Return updated user without password
        const updatedUser = await User.findById(req.params.id)
            .select('-password -__v')
            .lean()
            .exec();

        res.json(updatedUser);
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
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const address = user.addresses.id(req.params.addressId);
        
        if (!address) {
            return res.status(404).json({ message: 'Address not found' });
        }

        // Update address fields
        Object.assign(address, req.body);
        await user.save();

        // Return updated user without password
        const updatedUser = await User.findById(req.params.id)
            .select('-password -__v')
            .lean()
            .exec();

        res.json(updatedUser);
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
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove address using pull
        user.addresses.pull(req.params.addressId);
        await user.save();

        // Return updated user without password
        const updatedUser = await User.findById(req.params.id)
            .select('-password -__v')
            .lean()
            .exec();

        res.json(updatedUser);
    } catch (error) {
        console.error('[ERROR] Delete address:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// GET USER STATISTICS (ADMIN)
// ========================================
router.get('/:id/stats', protect, admin, async (req, res) => {
    try {
        const stats = await User.aggregate([
            { $match: { _id: mongoose.Types.ObjectId(req.params.id) } },
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
                    orderStatuses: {
                        $reduce: {
                            input: '$orders',
                            initialValue: {},
                            in: {
                                $mergeObjects: [
                                    '$$value',
                                    { $arrayToObject: [[{ k: '$$this.orderStatus', v: 1 }]] }
                                ]
                            }
                        }
                    }
                }
            }
        ]);

        if (stats.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(stats[0]);
    } catch (error) {
        console.error('[ERROR] Get user stats:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;