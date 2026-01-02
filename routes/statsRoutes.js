const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { Product } = require('../models/Product');
const User = require('../models/User');
const { protect, admin } = require('../middleware/authMiddleware');

// ========================================
// CACHE FOR STATS (1 minute cache)
// ========================================
const cache = new Map();
const CACHE_DURATION = 60000; // 1 minute

const getCachedOrFetch = async (key, fetchFn) => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }
    
    const data = await fetchFn();
    cache.set(key, { data, timestamp: Date.now() });
    
    // Clean up old cache
    if (cache.size > 10) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
    }
    
    return data;
};

// ========================================
// GET DASHBOARD STATS (OPTIMIZED)
// ========================================
router.get('/', protect, admin, async (req, res) => {
    try {
        const stats = await getCachedOrFetch('dashboard-stats', async () => {
            // Use Promise.all for parallel execution
            const [
                totalOrders,
                totalProducts,
                totalUsers,
                orderStats,
                recentOrders
            ] = await Promise.all([
                Order.countDocuments(),
                Product.countDocuments(),
                User.countDocuments(),
                // Get order statistics in one aggregation
                Order.aggregate([
                    {
                        $facet: {
                            pending: [
                                { $match: { orderStatus: { $in: ['Ordered', 'Processing'] } } },
                                { $count: 'count' }
                            ],
                            today: [
                                {
                                    $match: {
                                        createdAt: {
                                            $gte: new Date(new Date().setHours(0, 0, 0, 0))
                                        }
                                    }
                                },
                                { $count: 'count' }
                            ],
                            revenue: [
                                {
                                    $match: {
                                        orderStatus: { $ne: 'Cancelled' }
                                    }
                                },
                                {
                                    $group: {
                                        _id: null,
                                        total: { $sum: '$total' }
                                    }
                                }
                            ]
                        }
                    }
                ]),
                // Get recent orders efficiently
                Order.find({})
                    .select('orderId total orderStatus createdAt user')
                    .populate('user', 'name email')
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .lean()
                    .exec()
            ]);

            // Extract values from aggregation
            const pendingOrders = orderStats[0]?.pending[0]?.count || 0;
            const todayOrders = orderStats[0]?.today[0]?.count || 0;
            const totalRevenue = orderStats[0]?.revenue[0]?.total || 0;

            return {
                totalOrders,
                totalProducts,
                totalCustomers: totalUsers,
                pendingOrders,
                todayOrders,
                totalRevenue,
                recentOrders
            };
        });

        res.json(stats);
    } catch (error) {
        console.error('[ERROR] Get dashboard stats:', error);
        res.status(500).json({ message: 'Server Error: Failed to fetch stats' });
    }
});

// ========================================
// GET SALES ANALYTICS (OPTIMIZED)
// ========================================
router.get('/sales', protect, admin, async (req, res) => {
    try {
        const { period = '7days' } = req.query;
        
        const cacheKey = `sales-analytics-${period}`;
        
        const analytics = await getCachedOrFetch(cacheKey, async () => {
            let dateFilter;
            const now = new Date();
            
            switch (period) {
                case '24hours':
                    dateFilter = new Date(now - 24 * 60 * 60 * 1000);
                    break;
                case '7days':
                    dateFilter = new Date(now - 7 * 24 * 60 * 60 * 1000);
                    break;
                case '30days':
                    dateFilter = new Date(now - 30 * 24 * 60 * 60 * 1000);
                    break;
                case '90days':
                    dateFilter = new Date(now - 90 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    dateFilter = new Date(now - 7 * 24 * 60 * 60 * 1000);
            }

            const salesData = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: dateFilter },
                        orderStatus: { $ne: 'Cancelled' }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: {
                                format: '%Y-%m-%d',
                                date: '$createdAt'
                            }
                        },
                        totalSales: { $sum: '$total' },
                        orderCount: { $sum: 1 },
                        averageOrderValue: { $avg: '$total' }
                    }
                },
                {
                    $sort: { _id: 1 }
                },
                {
                    $project: {
                        date: '$_id',
                        totalSales: { $round: ['$totalSales', 2] },
                        orderCount: 1,
                        averageOrderValue: { $round: ['$averageOrderValue', 2] },
                        _id: 0
                    }
                }
            ]);

            return salesData;
        });

        res.json(analytics);
    } catch (error) {
        console.error('[ERROR] Get sales analytics:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET TOP PRODUCTS (OPTIMIZED)
// ========================================
router.get('/top-products', protect, admin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const cacheKey = `top-products-${limit}`;

        const topProducts = await getCachedOrFetch(cacheKey, async () => {
            return await Order.aggregate([
                {
                    $match: {
                        orderStatus: { $ne: 'Cancelled' }
                    }
                },
                {
                    $unwind: '$items'
                },
                {
                    $group: {
                        _id: '$items.product',
                        totalQuantity: { $sum: '$items.quantity' },
                        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                        orderCount: { $sum: 1 }
                    }
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'productInfo'
                    }
                },
                {
                    $unwind: '$productInfo'
                },
                {
                    $project: {
                        productId: '$_id',
                        name: '$productInfo.name',
                        image: { $arrayElemAt: ['$productInfo.images', 0] },
                        totalQuantity: 1,
                        totalRevenue: { $round: ['$totalRevenue', 2] },
                        orderCount: 1
                    }
                },
                {
                    $sort: { totalRevenue: -1 }
                },
                {
                    $limit: limit
                }
            ]);
        });

        res.json(topProducts);
    } catch (error) {
        console.error('[ERROR] Get top products:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET ORDER STATUS DISTRIBUTION (OPTIMIZED)
// ========================================
router.get('/order-status', protect, admin, async (req, res) => {
    try {
        const distribution = await getCachedOrFetch('order-status-distribution', async () => {
            return await Order.aggregate([
                {
                    $group: {
                        _id: '$orderStatus',
                        count: { $sum: 1 },
                        totalValue: { $sum: '$total' }
                    }
                },
                {
                    $project: {
                        status: '$_id',
                        count: 1,
                        totalValue: { $round: ['$totalValue', 2] },
                        _id: 0
                    }
                },
                {
                    $sort: { count: -1 }
                }
            ]);
        });

        res.json(distribution);
    } catch (error) {
        console.error('[ERROR] Get order status distribution:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET REVENUE BY CATEGORY (OPTIMIZED)
// ========================================
router.get('/revenue-by-category', protect, admin, async (req, res) => {
    try {
        const categoryRevenue = await getCachedOrFetch('revenue-by-category', async () => {
            return await Order.aggregate([
                {
                    $match: {
                        orderStatus: { $ne: 'Cancelled' }
                    }
                },
                {
                    $unwind: '$items'
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'items.product',
                        foreignField: '_id',
                        as: 'productInfo'
                    }
                },
                {
                    $unwind: '$productInfo'
                },
                {
                    $group: {
                        _id: '$productInfo.category',
                        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                        orderCount: { $sum: 1 },
                        productCount: { $addToSet: '$items.product' }
                    }
                },
                {
                    $project: {
                        category: '$_id',
                        totalRevenue: { $round: ['$totalRevenue', 2] },
                        orderCount: 1,
                        uniqueProducts: { $size: '$productCount' },
                        _id: 0
                    }
                },
                {
                    $sort: { totalRevenue: -1 }
                }
            ]);
        });

        res.json(categoryRevenue);
    } catch (error) {
        console.error('[ERROR] Get revenue by category:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CLEAR STATS CACHE (ADMIN)
// ========================================
router.post('/clear-cache', protect, admin, async (req, res) => {
    try {
        cache.clear();
        res.json({ message: 'Stats cache cleared successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;