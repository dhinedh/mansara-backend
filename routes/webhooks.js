const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const notificationService = require('../utils/notificationService');

/**
 * POST /api/webhooks/shiprocket
 * Handle Shiprocket push updates
 */
router.post('/shiprocket', async (req, res) => {
    try {
        const { awb, current_status, shipment_id, order_id } = req.body;

        if (!awb) {
            return res.status(400).json({ message: 'Missing AWB' });
        }

        console.log(`[SHIPROCKET WEBHOOK] Received update for AWB: ${awb}, Status: ${current_status}`);

        // Find order by AWB
        const order = await Order.findOne({ 'shipping.awb': awb }).populate('user');
        
        if (!order) {
            console.error(`[SHIPROCKET WEBHOOK] Order not found for AWB: ${awb}`);
            return res.status(404).json({ message: 'Order not found' });
        }

        // Map Shiprocket statuses to internal statuses
        // pending, picked_up, in_transit, out_for_delivery, delivered, rto_initiated, returned
        let internalStatus = order.shipping.status;
        let mainOrderStatus = order.orderStatus;

        const srStatus = current_status.toLowerCase();

        if (srStatus.includes('picked up')) {
            internalStatus = 'picked_up';
        } else if (srStatus.includes('shipped') || srStatus.includes('in transit')) {
            internalStatus = 'in_transit';
            mainOrderStatus = 'Shipped';
        } else if (srStatus.includes('out for delivery')) {
            internalStatus = 'out_for_delivery';
            mainOrderStatus = 'Out for Delivery';
        } else if (srStatus.includes('delivered')) {
            internalStatus = 'delivered';
            mainOrderStatus = 'Delivered';
        } else if (srStatus.includes('rto initiated')) {
            internalStatus = 'rto_initiated';
        } else if (srStatus.includes('returned')) {
            internalStatus = 'returned';
        }

        // Update Order
        order.shipping.status = internalStatus;
        order.shipping.lastUpdate = new Date();
        order.orderStatus = mainOrderStatus;

        await order.save();

        // Trigger customer notification (Optional)
        if (order.user) {
            try {
                // Using existing notification service if available
                await notificationService.sendOrderStatusUpdate(order, order.user, mainOrderStatus);
            } catch (notifyErr) {
                console.error('Failed to send webhook notification:', notifyErr);
            }
        }

        res.json({ success: true });

    } catch (error) {
        console.error('[SHIPROCKET WEBHOOK ERROR]', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
