const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// ========================================
// PERFORMANCE OPTIMIZATIONS ADDED:
// 1. Added .lean() where appropriate
// 2. Added field projection
// 3. Optimized update operations
// 4. Added query timeouts
// 5. Better error handling
// ========================================

// ========================================
// GET USER CART - OPTIMIZED
// ========================================
router.get('/', protect, async (req, res) => {
    try {
        // OPTIMIZATION: Only select cart field with lean()
        const user = await User.findById(req.user._id)
            .select('cart')
            .lean()
            .maxTimeMS(3000)
            .exec();
        
        res.json(user?.cart || []);
    } catch (error) {
        console.error('[ERROR] Get cart:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// ADD ITEM TO CART - OPTIMIZED
// ========================================
router.post('/add', protect, async (req, res) => {
    try {
        const { id, type, quantity, price, name, image } = req.body;

        if (!id || !type || !quantity || !price || !name) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // OPTIMIZATION: Use findOneAndUpdate with arrayFilters for atomic operation
        const user = await User.findOneAndUpdate(
            { 
                _id: req.user._id,
                'cart.id': { $ne: id } // Item not in cart
            },
            {
                $push: {
                    cart: { id, type, quantity, price, name, image }
                }
            },
            { new: true, select: 'cart' }
        )
        .maxTimeMS(5000)
        .exec();

        // If item already exists, update quantity instead
        if (!user) {
            const updatedUser = await User.findOneAndUpdate(
                { 
                    _id: req.user._id,
                    'cart.id': id
                },
                {
                    $inc: { 'cart.$.quantity': quantity }
                },
                { new: true, select: 'cart' }
            )
            .maxTimeMS(5000)
            .exec();

            return res.json(updatedUser?.cart || []);
        }

        res.json(user.cart);
    } catch (error) {
        console.error('[ERROR] Add to cart:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// UPDATE CART ITEM QUANTITY - OPTIMIZED
// ========================================
router.put('/update/:itemId', protect, async (req, res) => {
    try {
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ message: 'Valid quantity required' });
        }

        // OPTIMIZATION: Use positional operator for direct update
        const user = await User.findOneAndUpdate(
            { 
                _id: req.user._id,
                'cart.id': req.params.itemId
            },
            {
                $set: { 'cart.$.quantity': quantity }
            },
            { new: true, select: 'cart' }
        )
        .maxTimeMS(5000)
        .exec();

        if (!user) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        res.json(user.cart);
    } catch (error) {
        console.error('[ERROR] Update cart item:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// REMOVE ITEM FROM CART - OPTIMIZED
// ========================================
router.delete('/remove/:itemId', protect, async (req, res) => {
    try {
        // OPTIMIZATION: Use $pull to remove item
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                $pull: { cart: { id: req.params.itemId } }
            },
            { new: true, select: 'cart' }
        )
        .maxTimeMS(5000)
        .exec();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.cart);
    } catch (error) {
        console.error('[ERROR] Remove from cart:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// UPDATE ENTIRE CART - OPTIMIZED
// ========================================
router.put('/', protect, async (req, res) => {
    try {
        const { cart } = req.body;

        if (!Array.isArray(cart)) {
            return res.status(400).json({ message: 'Cart must be an array' });
        }

        // OPTIMIZATION: Direct update with validation
        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { cart } },
            { 
                new: true, 
                select: 'cart',
                runValidators: true 
            }
        )
        .maxTimeMS(5000)
        .exec();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user.cart);
    } catch (error) {
        console.error('[ERROR] Update cart:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CLEAR CART - OPTIMIZED
// ========================================
router.delete('/', protect, async (req, res) => {
    try {
        // OPTIMIZATION: Use updateOne for simple operation
        await User.updateOne(
            { _id: req.user._id },
            { $set: { cart: [] } }
        )
        .maxTimeMS(3000)
        .exec();

        res.json({ message: 'Cart cleared successfully', cart: [] });
    } catch (error) {
        console.error('[ERROR] Clear cart:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET CART SUMMARY - OPTIMIZED
// ========================================
router.get('/summary', protect, async (req, res) => {
    try {
        // OPTIMIZATION: Use aggregation for cart summary
        const summary = await User.aggregate([
            { $match: { _id: req.user._id } },
            { $unwind: { path: '$cart', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: null,
                    totalItems: { $sum: '$cart.quantity' },
                    totalPrice: { 
                        $sum: { $multiply: ['$cart.price', '$cart.quantity'] } 
                    },
                    items: { $push: '$cart' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalItems: { $ifNull: ['$totalItems', 0] },
                    totalPrice: { $ifNull: [{ $round: ['$totalPrice', 2] }, 0] },
                    itemCount: { $size: { $ifNull: ['$items', []] } }
                }
            }
        ])
        .maxTimeMS(5000)
        .exec();

        res.json(summary[0] || {
            totalItems: 0,
            totalPrice: 0,
            itemCount: 0
        });
    } catch (error) {
        console.error('[ERROR] Get cart summary:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// MERGE GUEST CART WITH USER CART - OPTIMIZED
// ========================================
router.post('/merge', protect, async (req, res) => {
    try {
        const { guestCart } = req.body;

        if (!Array.isArray(guestCart) || guestCart.length === 0) {
            return res.status(400).json({ message: 'Valid guest cart required' });
        }

        // Get user's current cart
        const user = await User.findById(req.user._id)
            .select('cart')
            .maxTimeMS(3000)
            .exec();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Merge carts (deduplicate by id, sum quantities)
        const cartMap = new Map();

        // Add existing cart items
        user.cart.forEach(item => {
            cartMap.set(item.id, item);
        });

        // Merge guest cart items
        guestCart.forEach(guestItem => {
            if (cartMap.has(guestItem.id)) {
                const existing = cartMap.get(guestItem.id);
                existing.quantity += guestItem.quantity;
            } else {
                cartMap.set(guestItem.id, guestItem);
            }
        });

        // Convert map back to array
        const mergedCart = Array.from(cartMap.values());

        // Update user cart
        user.cart = mergedCart;
        await user.save();

        res.json(user.cart);
    } catch (error) {
        console.error('[ERROR] Merge cart:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;