const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { Product } = require('../models/Product');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');

// Get dashboard stats
router.get('/', protect, admin, async (req, res) => {
    try {
        // Parallel fetching for performance
        const [
            totalOrders,
            totalProducts,
            totalUsers,
            pendingOrders,
            orders
        ] = await Promise.all([
            Order.countDocuments(),
            Product.countDocuments(),
            User.countDocuments(),
            Order.countDocuments({ status: 'pending' }),
            Order.find({}).select('createdAt') // Fetch dates to calculate today's orders
        ]);

        // Calculate today's orders
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const todayOrders = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= startOfDay && orderDate <= endOfDay;
        }).length;

        res.json({
            totalOrders,
            totalProducts,
            totalCustomers: totalUsers,
            pendingOrders,
            todayOrders
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error: Failed to fetch stats' });
    }
});

module.exports = router;
