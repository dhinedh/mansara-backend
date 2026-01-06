const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { protect, admin } = require('../middleware/authMiddleware');
const notificationService = require('../utils/notificationService');

// @desc    Get all reviews (Admin)
// @route   GET /api/reviews/admin
// @access  Private/Admin
router.get('/admin', protect, admin, async (req, res) => {
    try {
        const reviews = await Review.find({})
            .populate('user', 'name')
            .populate('product', 'name')
            .sort('-createdAt');
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Get reviews for a product (Public)
// @route   GET /api/reviews/product/:productId
// @access  Public
router.get('/product/:productId', async (req, res) => {
    try {
        const reviews = await Review.find({
            product: req.params.productId,
            isApproved: true
        })
            .populate('user', 'name')
            .sort('-createdAt');

        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Check eligibility to review
// @route   GET /api/reviews/check/:productId
// @access  Private
router.get('/check/:productId', protect, async (req, res) => {
    try {
        // Find delivered orders containing the product
        const order = await Order.findOne({
            user: req.user._id,
            orderStatus: 'Delivered',
            'orderItems.product': req.params.productId
        });

        if (!order) {
            return res.json({ canReview: false, message: 'You must purchase this product to review it.' });
        }

        // Check if already reviewed for this order
        const existingReview = await Review.findOne({
            user: req.user._id,
            product: req.params.productId,
            order: order._id
        });

        if (existingReview) {
            return res.json({ canReview: false, message: 'You have already reviewed this product for this order.' });
        }

        res.json({ canReview: true, orderId: order._id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Create a review
// @route   POST /api/reviews
// @access  Private
router.post('/', protect, async (req, res) => {
    try {
        const { rating, comment, images, video, productId } = req.body;

        // 1. Verify Purchase
        const order = await Order.findOne({
            user: req.user._id,
            orderStatus: 'Delivered',
            'orderItems.product': productId
        }).sort('-createdAt'); // Get most recent if multiple

        if (!order) {
            return res.status(400).json({ message: 'You can only review products you verify purchased and have been delivered.' });
        }

        // 2. Check for existing review for this specific order
        const alreadyReviewed = await Review.findOne({
            user: req.user._id,
            product: productId,
            order: order._id
        });

        if (alreadyReviewed) {
            return res.status(400).json({ message: 'You have already reviewed this product from this order.' });
        }

        const review = await Review.create({
            user: req.user._id,
            product: productId,
            order: order._id, // Link to specific order
            rating: Number(rating),
            comment,
            images,
            video,
            isVerifiedPurchase: true,
            isApproved: false // Requires approval
        });

        // Notify Admin
        setImmediate(async () => {
            try {
                const product = await Product.findById(productId);
                if (product) {
                    await notificationService.sendReviewAlert(review, product, req.user);
                }
            } catch (err) {
                console.error('Review alert failed:', err);
            }
        });

        res.status(201).json(review);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update review status (Approve/Reject)
// @route   PUT /api/reviews/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res) => {
    try {
        const { isApproved, adminResponse } = req.body;

        const review = await Review.findById(req.params.id);

        if (review) {
            review.isApproved = isApproved;
            if (adminResponse) review.adminResponse = adminResponse;

            await review.save(); // Triggers calcAverageRating
            res.json(review);
        } else {
            res.status(404).json({ message: 'Review not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Delete review
// @route   DELETE /api/reviews/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (review) {
            await review.deleteOne(); // Triggers calcAverageRating
            res.json({ message: 'Review removed' });
        } else {
            res.status(404).json({ message: 'Review not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
