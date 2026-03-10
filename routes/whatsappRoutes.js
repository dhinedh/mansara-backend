const express = require('express');
const router = express.Router();
const whatsappService = require('../utils/WhatsAppService');
const { protect, checkPermission } = require('../middleware/authMiddleware'); // Assuming this existence based on server.js imports

/**
 * Handle Order Lead from Frontend (Order via WhatsApp)
 */
router.post('/order-lead', async (req, res) => {
    try {
        const { phone, name, productInfo } = req.body;

        if (!phone || !name) {
            return res.status(400).json({ message: 'Phone and Name are required' });
        }

        // 1. Log as subscriber
        await whatsappService.createSubscriber(phone, name, {
            source: 'Website_Order_Lead',
            product: productInfo?.name || 'Unknown'
        });

        // 2. Feedback to frontend (redirection handled on client)
        res.json({ message: 'Lead logged successfully' });

    } catch (error) {
        console.error('[WHATSAPP ROUTE] Error logging lead:', error.message);
        res.status(500).json({ message: 'Failed to log lead' });
    }
});

/**
 * Get Conversation History (Admin Only)
 */
router.get('/conversation/:phone', protect, checkPermission('orders', 'view'), async (req, res) => {
    try {
        const history = await whatsappService.getConversation(req.params.phone);
        res.json(history);
    } catch (error) {
        console.error('[WHATSAPP ROUTE] Error fetching history:', error.message);
        res.status(500).json({ message: 'Failed to fetch conversation history' });
    }
});

module.exports = router;
