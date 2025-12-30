const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json(user.cart || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update user cart
// @route   PUT /api/cart
// @access  Private
router.put('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user) {
            user.cart = req.body;
            await user.save();
            res.json(user.cart);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
