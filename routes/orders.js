const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect } = require('../middleware/authMiddleware');
const shiprocketService = require('../services/shiprocket');

/**
 * POST /api/orders
 * Create order and trigger Shiprocket automation
 */
router.post('/', protect, async (req, res) => {
    try {
        const { items, total, paymentMethod, deliveryAddress } = req.body;

        // Basic validation
        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }

        // Create Order in MongoDB
        const order = new Order({
            user: req.user._id,
            items,
            total,
            paymentMethod,
            deliveryAddress,
            orderStatus: 'Ordered'
        });

        const savedOrder = await order.save();

        // Trigger Shiprocket Automation (Steps 2-4)
        // We run this in background or await depending on preference, 
        // but user asked to trigger it in sequence.
        const shippingResult = await shiprocketService.automateShipping(savedOrder._id);

        if (!shippingResult.success) {
            console.error('Shiprocket Automation Failed:', shippingResult.error);
            // Log error but order is already saved
        }

        const finalOrder = await Order.findById(savedOrder._id);
        res.status(201).json(finalOrder);

    } catch (error) {
        console.error('Order Creation Error:', error);
        res.status(500).json({ message: error.message });
    }
});

/**
 * GET /api/orders/:id/track
 * Return current shipping status from MongoDB
 */
router.get('/:id/track', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).select('shipping orderStatus');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json({
            status: order.orderStatus,
            shipping: order.shipping
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
