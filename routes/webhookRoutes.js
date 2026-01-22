const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const notificationService = require('../utils/notificationService');

// ========================================
// REUSABLE LOGIC
// ========================================
const findOrderByReference = async (ref) => {
    // Try finding by Order ID (ORD...)
    let order = await Order.findOne({ orderId: ref });

    // If not found, try finding by MongoDB ID
    if (!order && ref.match(/^[0-9a-fA-F]{24}$/)) {
        order = await Order.findById(ref);
    }

    return order;
};

// ========================================
// 1. SHIPMENT STATUS WEBHOOK
// Endpoint: POST /api/webhooks/shipping-updates
// ========================================
router.post('/shipping-updates', async (req, res) => {
    try {
        console.log('[WEBHOOK] Shipment Update Received:', JSON.stringify(req.body));

        // EXTRACT DATA (Adjust these field names based on iCarry documentation)
        // Common patterns: order_id, ref_id, awb, status, current_status, remark
        const { order_id, status, remark, location, timestamp } = req.body;

        if (!order_id || !status) {
            return res.status(400).json({ message: 'Missing order_id or status' });
        }

        const order = await findOrderByReference(order_id);
        if (!order) {
            console.error(`[WEBHOOK] Order not found: ${order_id}`);
            return res.status(404).json({ message: 'Order not found' });
        }

        // Capture tracking info if valid/present and not already set
        const trackingNumber = req.body.awb || req.body.tracking_number || req.body.awb_number;
        const courierName = req.body.courier || req.body.courier_name || 'iCarry';

        if (trackingNumber && !order.trackingNumber) {
            order.trackingNumber = trackingNumber;
            order.courier = courierName;
            await order.save();
        }

        // MAP STATUS TO INTERNAL STATUS
        // Internal: Ordered, Processing, Shipped, Out for Delivery, Delivered, Cancelled
        let newStatus = null;
        const incomingStatus = status.toLowerCase();

        if (incomingStatus.includes('shipped') || incomingStatus.includes('dispatch')) {
            newStatus = 'Shipped';
        } else if (incomingStatus.includes('out for delivery')) {
            newStatus = 'Out for Delivery';
        } else if (incomingStatus.includes('delivered')) {
            newStatus = 'Delivered';
        } else if (incomingStatus.includes('cancel') || incomingStatus.includes('returned')) {
            newStatus = 'Cancelled';
        }

        // UPDATE ORDER IF STATUS CHANGED
        if (newStatus && order.orderStatus !== newStatus) {
            // Check if valid transition (simple check)
            if (newStatus === 'Delivered' && order.orderStatus === 'Cancelled') {
                // Don't un-cancel
            } else {
                console.log(`[WEBHOOK] Updating Order ${order.orderId}: ${order.orderStatus} -> ${newStatus}`);

                // Use instance method to update status and tracking steps
                await order.updateStatus(newStatus, remark || `Update via Webhook: ${status}`);

                // Send Notifications
                const user = await require('../models/User').findById(order.user);
                if (user) {
                    // Notify User
                    notificationService.sendOrderStatusUpdate(order, user, newStatus)
                        .catch(err => console.error('[WEBHOOK] Notification failed:', err));

                    // If Delivered, request review
                    if (newStatus === 'Delivered') {
                        notificationService.sendReviewRequest(order, user)
                            .catch(err => console.error('[WEBHOOK] Review request failed:', err));
                    }
                }
            }
        } else {
            // Just add a note or log if status is same or unknown mapping involved
            // We can append to notes
            if (remark) {
                order.notes = (order.notes || '') + `\n[${new Date().toISOString()}] ${status}: ${remark}`;
                await order.save();
            }
        }

        res.json({ success: true, message: 'Update processed' });

    } catch (error) {
        console.error('[WEBHOOK] Error processing shipment update:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// ========================================
// 2. NDR (NON-DELIVERY REPORT) WEBHOOK
// Endpoint: POST /api/webhooks/ndr-updates
// ========================================
router.post('/ndr-updates', async (req, res) => {
    try {
        console.log('[WEBHOOK] NDR Alert Received:', JSON.stringify(req.body));

        const { order_id, reason, attempt_count, timestamp } = req.body;

        if (!order_id) {
            return res.status(400).json({ message: 'Missing order_id' });
        }

        const order = await findOrderByReference(order_id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Log NDR in order notes
        const ndrNote = `\n[NDR ALERT] Delivery Attempt Failed (${timestamp || new Date().toISOString()}). Reason: ${reason || 'Unknown'}`;
        order.notes = (order.notes || '') + ndrNote;

        // Optionally update status to something specific if you had 'Delivery Failed' status, 
        // but for now we might just keep it as 'Out for Delivery' or 'Shipped' and alert admin.

        await order.save();

        // NOTIFY ADMIN (via email)
        const adminEmail = process.env.EMAIL_FEEDBACK_TO || process.env.EMAIL_FROM;
        const emailService = require('../utils/sendEmail');

        if (adminEmail) {
            await emailService({
                email: adminEmail,
                subject: `NDR Alert: Order #${order.orderId}`,
                html: `
                    <h2>Non-Delivery Report Received</h2>
                    <p><strong>Order ID:</strong> ${order.orderId}</p>
                    <p><strong>Customer:</strong> ${order.deliveryAddress.firstName} ${order.deliveryAddress.lastName} (${order.deliveryAddress.phone})</p>
                    <p><strong>Reason:</strong> ${reason || 'Not provided'}</p>
                    <p><strong>Attempt:</strong> ${attempt_count || 'N/A'}</p>
                    <hr>
                    <p>Please contact the customer or courier partner.</p>
                `
            }).catch(err => console.error('[WEBHOOK] Admin NDR alert failed', err));
        }

        res.json({ success: true, message: 'NDR logged' });

    } catch (error) {
        console.error('[WEBHOOK] Error processing NDR:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
