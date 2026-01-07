const mongoose = require('mongoose');

// ========================================
// PERFORMANCE OPTIMIZATIONS ADDED:
// 1. Optimized indexes for common queries
// 2. Compound indexes for filtering
// 3. Efficient post-save hook for rating calculation
// 4. Better static methods
// ========================================

const reviewSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: true,
        maxlength: 1000
    },
    images: [String],
    video: String,
    isVerifiedPurchase: {
        type: Boolean,
        default: true
    },
    isApproved: {
        type: Boolean,
        default: false,
        index: true
    },
    adminResponse: {
        text: String,
        date: Date
    },
    helpful: {
        type: Number,
        default: 0
    },
    reported: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// ========================================
// COMPOUND INDEXES
// ========================================
reviewSchema.index({ product: 1, isApproved: 1, createdAt: -1 });
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });
reviewSchema.index({ product: 1, rating: -1 });

// ========================================
// STATIC METHOD: Calculate Average Rating
// ========================================
reviewSchema.statics.calcAverageRating = async function (productId) {
    const stats = await this.aggregate([
        { $match: { product: productId, isApproved: true } },
        {
            $group: {
                _id: '$product',
                avgRating: { $avg: '$rating' },
                numReviews: { $sum: 1 }
            }
        }
    ]);

    try {
        const { Product } = require('./Product');
        if (stats.length > 0) {
            await Product.findByIdAndUpdate(productId, {
                rating: Math.round(stats[0].avgRating * 10) / 10,
                numReviews: stats[0].numReviews
            });
        } else {
            await Product.findByIdAndUpdate(productId, {
                rating: 0,
                numReviews: 0
            });
        }
    } catch (error) {
        console.error('[REVIEW] Error updating product rating:', error);
    }
};

// ========================================
// POST-SAVE HOOK
// ========================================
reviewSchema.post('save', async function () {
    await this.constructor.calcAverageRating(this.product);
});

// ========================================
// POST-REMOVE HOOK
// ========================================
reviewSchema.post('remove', async function () {
    await this.constructor.calcAverageRating(this.product);
});

module.exports = mongoose.model('Review', reviewSchema);