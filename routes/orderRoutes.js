const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/authMiddleware');

const notificationService = require('../utils/notificationService');

// Create new order
router.post('/', protect, async (req, res) => {
    try {
        const { items, total, paymentMethod, deliveryAddress } = req.body;
        console.log('DEBUG: Creating Order. Body:', JSON.stringify(req.body, null, 2));
        console.log('DEBUG: Delivery Address:', JSON.stringify(deliveryAddress, null, 2));

        // Basic validation
        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }

        // Generate a custom Order ID
        const orderId = `#ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const order = new Order({
            user: req.user._id,
            orderId, // Add generated ID
            items,
            total,
            paymentMethod,
            deliveryAddress
        });

        const createdOrder = await order.save();

        // Send Notifications (Async - don't await/block response)
        notificationService.sendOrderConfirmation(createdOrder, req.user);

        res.status(201).json(createdOrder);
    } catch (error) {
        console.error('Order Creation Error:', error);
        res.status(400).json({ message: error.message });
    }
});

// Get user orders
router.get('/user/:userId', async (req, res) => {
    try {
        const orders = await Order.find({ user: req.params.userId }).sort({ date: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/', protect, admin, async (req, res) => {
    try {
        const orders = await Order.find({}).sort({ createdAt: -1 }).populate('user', 'id name email phone whatsapp');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
