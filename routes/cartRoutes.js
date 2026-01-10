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
        const { id, type, quantity, price, name, image } = req.body;

        if (!id || !type || !quantity || !price || !name) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // ========================================
        // STOCK MANAGEMENT: CHECK & DEDUCT
        // ========================================
        const Model = type === 'combo' ? Combo : Product;
        const product = await Model.findById(id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ message: `Insufficient stock for ${name}` });
        }

        // Deduct stock immediately
        product.stock -= quantity;
        await product.save();

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
        // ========================================
        // STOCK RESTORATION
        // ========================================
        const userForStock = await User.findById(req.user._id).select('cart');
        if (userForStock) {
            const itemToRemove = userForStock.cart.find(item => item.id === req.params.itemId);
            if (itemToRemove) {
                const Model = itemToRemove.type === 'combo' ? Combo : Product;
                const product = await Model.findById(itemToRemove.id);
                if (product) {
                    product.stock += itemToRemove.quantity;
                    await product.save();
                    console.log(`[STOCK] Restored ${itemToRemove.quantity} for ${product.name} (Removed from cart)`);
                }
            }
        }

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

        // ========================================
        // STOCK SYNC LOGIC
        // ========================================
        const user = await User.findById(req.user._id).select('cart');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const oldCart = user.cart || [];
        const newCart = cart;

        // 1. Handle increments (Reserve Stock)
        for (const newItem of newCart) {
            const oldItem = oldCart.find(i => i.id === newItem.id);
            let quantityToDeduct = 0;

            if (!oldItem) {
                // New item added directly to list
                quantityToDeduct = newItem.quantity;
            } else if (newItem.quantity > oldItem.quantity) {
                // Quantity increased
                quantityToDeduct = newItem.quantity - oldItem.quantity;
            }

            if (quantityToDeduct > 0) {
                const Model = newItem.type === 'combo' ? Combo : Product;
                const product = await Model.findById(newItem.id);
                if (product) {
                    if (product.stock >= quantityToDeduct) {
                        product.stock -= quantityToDeduct;
                        await product.save();
                    } else {
                        // If insufficient stock, we might need to reject or just cap it.
                        // For bulk sync, capping is safer to avoid blocking ui.
                        console.warn(`[WARN] Insufficient stock during sync for ${product.name}`);
                    }
                }
            }
        }

        // 2. Handle decrements (Restore Stock)
        for (const oldItem of oldCart) {
            const newItem = newCart.find(i => i.id === oldItem.id);
            let quantityToRestore = 0;

            if (!newItem) {
                // Item removed
                quantityToRestore = oldItem.quantity;
            } else if (newItem.quantity < oldItem.quantity) {
                // Quantity decreased
                quantityToRestore = oldItem.quantity - newItem.quantity;
            }

            if (quantityToRestore > 0) {
                const Model = oldItem.type === 'combo' ? Combo : Product;
                const product = await Model.findById(oldItem.id);
                if (product) {
                    product.stock += quantityToRestore;
                    await product.save();
                }
            }
        }

        // OPTIMIZATION: Direct update with validation
        const updatedUser = await User.findByIdAndUpdate(
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
        // ========================================
        // STOCK RESTORATION FOR ALL ITEMS
        // ========================================
        const user = await User.findById(req.user._id).select('cart');
        if (user && user.cart.length > 0) {
            for (const item of user.cart) {
                const Model = item.type === 'combo' ? Combo : Product;
                const product = await Model.findById(item.id);
                if (product) {
                    product.stock += item.quantity;
                    await product.save();
                    console.log(`[STOCK] Restored ${item.quantity} for ${product.name} (Cart cleared)`);
                }
            }
        }

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

        // ========================================
        // STOCK DEDUCTION FOR GUEST ITEMS
        // ========================================
        for (const guestItem of guestCart) {
            const Model = guestItem.type === 'combo' ? Combo : Product;
            const product = await Model.findById(guestItem.id);

            if (product) {
                if (product.stock >= guestItem.quantity) {
                    product.stock -= guestItem.quantity;
                    await product.save();
                } else {
                    console.warn(`[WARN] Insufficient stock during merge for ${product.name}, merging anyway`);
                }
            }

            if (cartMap.has(guestItem.id)) {
                const existing = cartMap.get(guestItem.id);
                existing.quantity += guestItem.quantity;
            } else {
                cartMap.set(guestItem.id, guestItem);
            }
        }

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