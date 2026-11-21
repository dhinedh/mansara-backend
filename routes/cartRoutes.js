const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { Product, Combo } = require('../models/Product');

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
        const { id, type, quantity, price, name, image, weight } = req.body;

        if (!id || !type || !quantity || price === undefined || !name) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
``
        const sanitizedItem = {
            id: String(id),
            type: type === 'combo' ? 'combo' : 'product',
            quantity: Math.max(1, Math.min(999, Number(quantity) || 1)),
            price: Math.max(0, Number(price) || 0),
            name: String(name),
            image: image || '',
            weight: weight ? String(weight) : undefined
        };

        const user = await User.findById(req.user._id).select('cart');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const cart = user.cart || [];
        const existingIndex = cart.findIndex(i => i.id === sanitizedItem.id && (i.weight || '') === (sanitizedItem.weight || ''));

        if (existingIndex > -1) {
            cart[existingIndex].quantity = Math.min(999, cart[existingIndex].quantity + sanitizedItem.quantity);
        } else {
            cart.push(sanitizedItem);
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { cart } },
            { new: true, select: 'cart', runValidators: true }
        )
            .maxTimeMS(5000)
            .exec();

        res.json(updatedUser?.cart || cart);
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
        const rawCart = Array.isArray(req.body) ? req.body : req.body?.cart;

        if (!Array.isArray(rawCart)) {
            return res.status(400).json({ message: 'Cart must be an array' });
        }

        // Clean & sanitize cart items
        const sanitizedCart = rawCart.map(item => ({
            id: String(item.id || item._id || ''),
            type: item.type === 'combo' ? 'combo' : 'product',
            quantity: Math.max(1, Math.min(999, Number(item.quantity) || 1)),
            price: Math.max(0, Number(item.price) || 0),
            name: String(item.name || 'Item'),
            image: item.image || '',
            weight: item.weight ? String(item.weight) : undefined
        })).filter(item => item.id);

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { cart: sanitizedCart } },
            {
                new: true,
                select: 'cart',
                runValidators: true
            }
        )
            .maxTimeMS(5000)
            .exec();

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(updatedUser.cart);
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

        // Merge carts (deduplicate by id + weight, sum quantities)
        const cartMap = new Map();
        const getItemKey = (item) => `${item.id}_${item.weight || ''}`;

        // Add existing cart items
        (user.cart || []).forEach(item => {
            const rawItem = item.toObject ? item.toObject() : item;
            cartMap.set(getItemKey(rawItem), rawItem);
        });

        // Merge guest items
        for (const guestItem of guestCart) {
            if (!guestItem || !guestItem.id) continue;
            const key = getItemKey(guestItem);
            const sanitizedGuest = {
                id: String(guestItem.id),
                type: guestItem.type === 'combo' ? 'combo' : 'product',
                quantity: Math.max(1, Math.min(999, Number(guestItem.quantity) || 1)),
                price: Math.max(0, Number(guestItem.price) || 0),
                name: String(guestItem.name || 'Item'),
                image: guestItem.image || '',
                weight: guestItem.weight ? String(guestItem.weight) : undefined
            };

            if (cartMap.has(key)) {
                const existing = cartMap.get(key);
                existing.quantity = Math.min(999, existing.quantity + sanitizedGuest.quantity);
            } else {
                cartMap.set(key, sanitizedGuest);
            }
        }

        const mergedCart = Array.from(cartMap.values());

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { cart: mergedCart } },
            { new: true, select: 'cart', runValidators: true }
        )
            .maxTimeMS(5000)
            .exec();

        res.json(updatedUser ? updatedUser.cart : mergedCart);
    } catch (error) {
        console.error('[ERROR] Merge cart:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;