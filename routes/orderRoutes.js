const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { protect, admin } = require('../middleware/authMiddleware');
const notificationService = require('../utils/notificationService');

// ========================================
// CREATE NEW ORDER (OPTIMIZED)
// ========================================
router.post('/', protect, async (req, res) => {
    try {
        const { items, total, paymentMethod, deliveryAddress } = req.body;

        // Basic validation
        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }

        // Generate a custom Order ID
        const orderId = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;

        // Initialize tracking steps
        const trackingSteps = [
            {
                status: 'Ordered',
                date: new Date(),
                completed: true
            },
            { status: 'Processing', completed: false },
            { status: 'Shipped', completed: false },
            { status: 'Out for Delivery', completed: false },
            { status: 'Delivered', completed: false }
        ];

        const order = new Order({
            user: req.user._id,
            orderId,
            items,
            total,
            paymentMethod,
            deliveryAddress,
            orderStatus: 'Ordered',
            paymentStatus: paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Paid',
            trackingSteps
        });

        const createdOrder = await order.save();

        // ========================================
        // SEND NOTIFICATION ASYNCHRONOUSLY (NON-BLOCKING)
        // ========================================
        // Don't wait for notification - send it in background
        setImmediate(async () => {
            try {
                console.log(`[NOTIFICATION] Sending order placed notification (Order: ${orderId})`);
                await notificationService.sendOrderPlaced(createdOrder, req.user);
            } catch (notifError) {
                console.error('[ERROR] Failed to send notification:', notifError);
                // Don't throw - just log
            }
        });

        // Return response immediately without waiting for notification
        res.status(201).json(createdOrder);

    } catch (error) {
        console.error('[ERROR] Order Creation:', error);
        res.status(400).json({ message: error.message });
    }
});

// ========================================
// GET USER ORDERS (OPTIMIZED WITH PAGINATION)
// ========================================
router.get('/user/:userId', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Use lean() for better performance
        const [orders, total] = await Promise.all([
            Order.find({ user: req.params.userId })
                .select('-__v')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('user', 'name email phone whatsapp')
                .lean()
                .exec(),
            Order.countDocuments({ user: req.params.userId })
        ]);

        res.json({
            orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('[ERROR] Get user orders:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET ALL ORDERS (ADMIN) - OPTIMIZED
// ========================================
router.get('/', protect, admin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const { status, paymentStatus, search } = req.query;

        // Build query
        const query = {};
        if (status) query.orderStatus = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        if (search) query.orderId = { $regex: search, $options: 'i' };

        // Execute query with lean() for performance
        const [orders, total] = await Promise.all([
            Order.find(query)
                .select('-__v')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('user', 'id name email phone whatsapp')
                .lean()
                .exec(),
            Order.countDocuments(query)
        ]);

        res.json({
            orders,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('[ERROR] Get all orders:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET SINGLE ORDER (OPTIMIZED)
// ========================================
router.get('/:id', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email phone whatsapp')
            .lean()
            .exec();

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('[ERROR] Get single order:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CONFIRM ORDER (ADMIN) - WITH ASYNC NOTIFICATION
// ========================================
router.put('/:id/confirm', protect, admin, async (req, res) => {
    try {
        const { estimatedDeliveryDate } = req.body;

        const order = await Order.findById(req.params.id)
            .populate('user', 'name email phone whatsapp');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.orderStatus !== 'Ordered') {
            return res.status(400).json({ message: 'Order already confirmed or processed' });
        }

        // Update order status
        order.orderStatus = 'Processing';

        // Update tracking steps
        const processingStep = order.trackingSteps.find(step => step.status === 'Processing');
        if (processingStep) {
            processingStep.completed = true;
            processingStep.date = new Date();
        }

        // Set estimated delivery date
        if (estimatedDeliveryDate) {
            order.estimatedDeliveryDate = new Date(estimatedDeliveryDate);
        } else {
            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + 4);
            order.estimatedDeliveryDate = deliveryDate;
        }

        await order.save();

        if (!order.user) {
            console.warn(`[WARN] Order ${order._id} has no associated user (user likely deleted)`);
            // Continue confirmation but limit notification capability
            order.user = { name: 'Customer', email: '', phone: '' };
        }

        // Send notification asynchronously (non-blocking)
        setImmediate(async () => {
            try {
                // If user is virtual/dummy, notificationService checks should handle it or fail gracefully
                if (order.user.email || order.user.phone || order.deliveryAddress?.phone) {
                    await notificationService.sendOrderConfirmed(order, order.user);
                }
            } catch (notifError) {
                console.error('[ERROR] Failed to send confirmation:', notifError);
            }
        });

        res.json(order);
    } catch (error) {
        console.error('[ERROR] Order Confirmation:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// UPDATE ORDER STATUS (ADMIN) - OPTIMIZED
// ========================================
router.put('/:id/status', protect, admin, async (req, res) => {
    try {
        const { status } = req.body;

        const validStatuses = ['Ordered', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const order = await Order.findById(req.params.id)
            .populate('user', 'name email phone whatsapp');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Update order status
        order.orderStatus = status;

        // Update tracking steps
        const currentStep = order.trackingSteps.find(step => step.status === status);
        if (currentStep) {
            currentStep.completed = true;
            currentStep.date = new Date();
        }

        await order.save();

        // Send status update notification asynchronously
        setImmediate(async () => {
            try {
                await notificationService.sendOrderStatusUpdate(order, order.user, status);
            } catch (notifError) {
                console.error('[ERROR] Failed to send status update:', notifError);
            }
        });

        res.json(order);
    } catch (error) {
        console.error('[ERROR] Order Status Update:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CANCEL ORDER (OPTIMIZED)
// ========================================
router.put('/:id/cancel', protect, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('user', 'name email phone whatsapp');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user owns the order or is admin
        if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (order.orderStatus === 'Delivered') {
            return res.status(400).json({ message: 'Cannot cancel delivered order' });
        }

        order.orderStatus = 'Cancelled';
        await order.save();

        // Send cancellation notification asynchronously
        setImmediate(async () => {
            try {
                await notificationService.sendOrderCancelled(order, order.user);
            } catch (notifError) {
                console.error('[ERROR] Failed to send cancellation notification:', notifError);
            }
        });

        res.json(order);
    } catch (error) {
        console.error('[ERROR] Order Cancellation:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET ORDER STATISTICS (ADMIN)
// ========================================
router.get('/stats/summary', protect, admin, async (req, res) => {
    try {
        const stats = await Order.aggregate([
            {
                $facet: {
                    statusCount: [
                        { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
                    ],
                    paymentCount: [
                        { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
                    ],
                    totalRevenue: [
                        { $match: { orderStatus: { $ne: 'Cancelled' } } },
                        { $group: { _id: null, total: { $sum: '$total' } } }
                    ],
                    recentOrders: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 10 },
                        { $project: { orderId: 1, total: 1, orderStatus: 1, createdAt: 1 } }
                    ]
                }
            }
        ]);

        res.json(stats[0]);
    } catch (error) {
        console.error('[ERROR] Get order stats:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;