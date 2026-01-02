// ========================================
// CART ROUTES (OPTIMIZED)
// ========================================
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('cart')
            .lean()
            .exec();
        
        res.json(user?.cart || []);
    } catch (error) {
        console.error('[ERROR] Get cart:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update user cart
// @route   PUT /api/cart
// @access  Private
router.put('/', protect, async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { cart: req.body } },
            { new: true, select: 'cart' }
        ).lean().exec();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.cart);
    } catch (error) {
        console.error('[ERROR] Update cart:', error);
        res.status(500).json({ message: error.message });
    }
});

// @desc    Clear user cart
// @route   DELETE /api/cart
// @access  Private
router.delete('/', protect, async (req, res) => {
    try {
        await User.findByIdAndUpdate(
            req.user._id,
            { $set: { cart: [] } }
        );

        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        console.error('[ERROR] Clear cart:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;