const mongoose = require('mongoose');

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
        required: true
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
        trim: true
    },
    images: [{
        type: String
    }],
    video: {
        type: String
    },
    isApproved: {
        type: Boolean,
        default: false,
        index: true
    },
    isVerifiedPurchase: {
        type: Boolean,
        default: true
    },
    adminResponse: {
        type: String
    }
}, {
    timestamps: true
});

// Prevent user from reviewing the same product multiple times per order
reviewSchema.index({ user: 1, product: 1, order: 1 }, { unique: true });

// Static method to calculate average rating
reviewSchema.statics.calcAverageRating = async function (productId) {
    const stats = await this.aggregate([
        {
            $match: { product: productId, isApproved: true }
        },
        {
            $group: {
                _id: '$product',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ]);

    try {
        await this.model('Product').findByIdAndUpdate(productId, {
            rating: stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0,
            numReviews: stats.length > 0 ? stats[0].nRating : 0
        });
    } catch (err) {
        console.error(err);
    }
};

// Call calcAverageRating after save and delete
reviewSchema.post('save', function () {
    // Only recalc if approved status changed or new review
    this.constructor.calcAverageRating(this.product);
});

reviewSchema.post('remove', function () {
    this.constructor.calcAverageRating(this.product);
});

module.exports = mongoose.model('Review', reviewSchema);
