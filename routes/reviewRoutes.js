const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Order = require('../models/Order');
const { Product } = require('../models/Product');
const { protect, admin, checkPermission } = require('../middleware/authMiddleware');
const notificationService = require('../utils/notificationService');

// ========================================
// PERFORMANCE OPTIMIZATIONS ADDED:
// 1. Added .lean() to all queries
// 2. Added field projection
// 3. Made notifications non-blocking
// 4. Optimized populate calls
// 5. Added query timeouts
// 6. Better index utilization
// ========================================

// ========================================
// GET ALL REVIEWS (ADMIN) - OPTIMIZED
// ========================================
router.get('/admin', protect, checkPermission('products', 'view'), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const skip = (page - 1) * limit;

        // OPTIMIZATION: Use lean() and limit populate fields
        const [reviews, total] = await Promise.all([
            Review.find({})
                .select('-__v')
                .populate('user', 'name email')
                .populate('product', 'name image')
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .lean()
                .maxTimeMS(10000)
                .exec(),
            Review.countDocuments()
                .maxTimeMS(5000)
                .exec()
        ]);

        res.json({
            reviews,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('[ERROR] Get admin reviews:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET REVIEWS FOR A PRODUCT (PUBLIC) - OPTIMIZED
// ========================================
router.get('/product/:productId', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50);
        const skip = (page - 1) * limit;

        // OPTIMIZATION: Only get approved reviews with lean()
        const [reviews, total] = await Promise.all([
            Review.find({
                product: req.params.productId,
                isApproved: true
            })
                .select('rating comment images video createdAt isVerifiedPurchase adminResponse')
                .populate('user', 'name') // Only user name
                .sort('-createdAt')
                .skip(skip)
                .limit(limit)
                .lean()
                .maxTimeMS(5000)
                .exec(),
            Review.countDocuments({
                product: req.params.productId,
                isApproved: true
            })
                .maxTimeMS(3000)
                .exec()
        ]);

        res.json({
            reviews,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('[ERROR] Get product reviews:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET REVIEW STATS FOR PRODUCT - OPTIMIZED
// ========================================
router.get('/product/:productId/stats', async (req, res) => {
    try {
        // OPTIMIZATION: Use aggregation for stats
        const stats = await Review.aggregate([
            {
                $match: {
                    product: require('mongoose').Types.ObjectId(req.params.productId),
                    isApproved: true
                }
            },
            {
                $group: {
                    _id: null,
                    averageRating: { $avg: '$rating' },
                    totalReviews: { $sum: 1 },
                    ratingDistribution: {
                        $push: '$rating'
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    averageRating: { $round: ['$averageRating', 1] },
                    totalReviews: 1,
                    fiveStars: {
                        $size: {
                            $filter: {
                                input: '$ratingDistribution',
                                cond: { $eq: ['$$this', 5] }
                            }
                        }
                    },
                    fourStars: {
                        $size: {
                            $filter: {
                                input: '$ratingDistribution',
                                cond: { $eq: ['$$this', 4] }
                            }
                        }
                    },
                    threeStars: {
                        $size: {
                            $filter: {
                                input: '$ratingDistribution',
                                cond: { $eq: ['$$this', 3] }
                            }
                        }
                    },
                    twoStars: {
                        $size: {
                            $filter: {
                                input: '$ratingDistribution',
                                cond: { $eq: ['$$this', 2] }
                            }
                        }
                    },
                    oneStar: {
                        $size: {
                            $filter: {
                                input: '$ratingDistribution',
                                cond: { $eq: ['$$this', 1] }
                            }
                        }
                    }
                }
            }
        ])
            .maxTimeMS(5000)
            .exec();

        res.json(stats[0] || {
            averageRating: 0,
            totalReviews: 0,
            fiveStars: 0,
            fourStars: 0,
            threeStars: 0,
            twoStars: 0,
            oneStar: 0
        });
    } catch (error) {
        console.error('[ERROR] Get review stats:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CHECK ELIGIBILITY TO REVIEW - OPTIMIZED
// ========================================
router.get('/check/:productId', protect, async (req, res) => {
    try {
        // OPTIMIZATION: Find delivered order with lean()
        const order = await Order.findOne({
            user: req.user._id,
            orderStatus: 'Delivered',
            'items.product': req.params.productId
        })
            .select('_id')
            .lean()
            .maxTimeMS(5000)
            .exec();

        if (!order) {
            return res.json({
                canReview: false,
                message: 'You must purchase this product to review it.'
            });
        }

        // Check if already reviewed
        const existingReview = await Review.findOne({
            user: req.user._id,
            product: req.params.productId,
            order: order._id
        })
            .select('_id')
            .lean()
            .maxTimeMS(3000)
            .exec();

        if (existingReview) {
            return res.json({
                canReview: false,
                message: 'You have already reviewed this product for this order.'
            });
        }

        res.json({ canReview: true, orderId: order._id });
    } catch (error) {
        console.error('[ERROR] Check review eligibility:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CREATE A REVIEW - OPTIMIZED
// ========================================
router.post('/', protect, async (req, res) => {
    try {
        const { rating, comment, images, video, productId } = req.body;

        // 1. Verify Purchase
        const order = await Order.findOne({
            user: req.user._id,
            orderStatus: 'Delivered',
            'items.product': productId
        })
            .select('_id')
            .sort('-createdAt')
            .lean()
            .maxTimeMS(5000)
            .exec();

        if (!order) {
            return res.status(400).json({
                message: 'You can only review products you have purchased and received.'
            });
        }

        // 2. Check for existing review
        const alreadyReviewed = await Review.findOne({
            user: req.user._id,
            product: productId,
            order: order._id
        })
            .select('_id')
            .lean()
            .maxTimeMS(3000)
            .exec();

        if (alreadyReviewed) {
            return res.status(400).json({
                message: 'You have already reviewed this product from this order.'
            });
        }

        // 3. Create review
        const review = await Review.create({
            user: req.user._id,
            product: productId,
            order: order._id,
            rating: Number(rating),
            comment,
            images,
            video,
            isVerifiedPurchase: true,
            isApproved: false
        });

        // OPTIMIZATION: Send admin notification asynchronously (non-blocking)
        process.nextTick(async () => {
            try {
                const product = await Product.findById(productId)
                    .select('name')
                    .lean()
                    .exec();

                if (product) {
                    await notificationService.sendReviewAlert(review, product, req.user);
                }
            } catch (err) {
                console.error('[ERROR] Review notification failed:', err);
            }
        });

        res.status(201).json(review);
    } catch (error) {
        console.error('[ERROR] Create review:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// UPDATE REVIEW STATUS (ADMIN) - OPTIMIZED
// ========================================
router.put('/:id', protect, checkPermission('products', 'limited'), async (req, res) => {
    try {
        const { isApproved, adminResponse } = req.body;

        // Don't use lean() here as we need the save middleware to trigger
        const review = await Review.findById(req.params.id)
            .maxTimeMS(5000)
            .exec();

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        review.isApproved = isApproved;
        if (adminResponse) review.adminResponse = adminResponse;

        await review.save(); // Triggers calcAverageRating middleware

        res.json(review);
    } catch (error) {
        console.error('[ERROR] Update review status:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// DELETE REVIEW (ADMIN) - OPTIMIZED
// ========================================
router.delete('/:id', protect, checkPermission('products', 'full'), async (req, res) => {
    try {
        const review = await Review.findById(req.params.id)
            .maxTimeMS(5000)
            .exec();

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        await review.deleteOne(); // Triggers calcAverageRating middleware

        res.json({ message: 'Review removed' });
    } catch (error) {
        console.error('[ERROR] Delete review:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// BULK APPROVE REVIEWS (ADMIN) - OPTIMIZED
// ========================================
router.post('/bulk/approve', protect, checkPermission('products', 'limited'), async (req, res) => {
    try {
        const { reviewIds } = req.body;

        if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
            return res.status(400).json({ message: 'Review IDs required' });
        }

        // Update all at once
        const result = await Review.updateMany(
            { _id: { $in: reviewIds } },
            { $set: { isApproved: true } }
        )
            .maxTimeMS(10000)
            .exec();

        // Recalculate ratings for affected products
        const reviews = await Review.find({ _id: { $in: reviewIds } })
            .select('product')
            .lean()
            .exec();

        const uniqueProductIds = [...new Set(reviews.map(r => r.product.toString()))];

        for (const productId of uniqueProductIds) {
            await Review.calcAverageRating(productId);
        }

        res.json({
            message: `${result.modifiedCount} reviews approved successfully`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('[ERROR] Bulk approve reviews:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET PENDING REVIEWS (ADMIN) - OPTIMIZED
// ========================================
router.get('/pending/list', protect, checkPermission('products', 'view'), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);

        const reviews = await Review.find({ isApproved: false })
            .select('rating comment product user createdAt')
            .populate('user', 'name email')
            .populate('product', 'name image')
            .sort('-createdAt')
            .limit(limit)
            .lean()
            .maxTimeMS(5000)
            .exec();

        res.json(reviews);
    } catch (error) {
        console.error('[ERROR] Get pending reviews:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;