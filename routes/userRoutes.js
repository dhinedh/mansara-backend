const express = require('express');
const router = express.Router();
const User = require('../models/User');

const { protect, admin } = require('../middleware/authMiddleware');
const Order = require('../models/Order');

// Get all users (Admin only)
router.get('/', protect, admin, async (req, res) => {
    try {
        const users = await User.aggregate([
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
                    __v: 0
                }
            },
            { $sort: { createdAt: -1 } }
        ]);
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user profile (mock auth for now - get by email or ID)
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (user) res.json(user);
        else res.status(404).json({ message: 'User not found' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user
router.put('/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(user);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Add Address
router.post('/:id/address', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.addresses.push(req.body);
        const updatedUser = await user.save();
        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update Address
router.put('/:id/address/:addressId', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const address = user.addresses.id(req.params.addressId);
        if (!address) return res.status(404).json({ message: 'Address not found' });

        Object.assign(address, req.body);
        const updatedUser = await user.save();
        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete Address
router.delete('/:id/address/:addressId', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.addresses.pull(req.params.addressId);
        const updatedUser = await user.save();
        res.json(updatedUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

module.exports = router;
