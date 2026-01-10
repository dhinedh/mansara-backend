const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { Product } = require('../models/Product');
const { protect } = require('../middleware/authMiddleware'); // Optional protect if we want only logged in users

// ========================================
// SUBSCRIBE TO STOCK ALERTS
// ========================================
router.post('/subscribe', async (req, res) => {
    try {
        const { productId, whatsapp, userId } = req.body;

        if (!productId || !whatsapp) {
            return res.status(400).json({ message: 'Product ID and WhatsApp number are required' });
        }

        // Verify product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if already subscribed
        const existing = await Notification.findOne({
            product: productId,
            whatsapp: whatsapp,
            status: 'pending'
        });

        if (existing) {
            return res.status(200).json({ message: 'You are already subscribed to alerts for this product.' });
        }

        // Create subscription
        await Notification.create({
            product: productId,
            whatsapp,
            user: userId || null
        });

        res.status(201).json({ message: 'Successfully subscribed! We will notify you when stock arrives.' });

    } catch (error) {
        console.error('[ERROR] Subscribe notification:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
