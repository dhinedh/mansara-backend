const mongoose = require('mongoose');

// ========================================
// PERFORMANCE OPTIMIZATIONS ADDED:
// 1. Optimized indexes for common queries
// 2. Compound indexes for filtering + sorting
// 3. Text index for search
// 4. Efficient virtuals
// 5. Better static methods for queries
// 6. Sparse indexes for optional fields
// ========================================

// ========================================
// PRODUCT SCHEMA
// ========================================
const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    slug: {
        type: String,
        unique: true,
        index: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true,
        min: 0,
        index: true
    },
    originalPrice: {
        type: Number,
        min: 0
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
        index: true
    },
    image: {
        type: String,
        required: true
    },
    images: [String],
    stock: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
        index: true
    },
    weight: String,
    unit: String,
    nutritionalInfo: {
        calories: Number,
        protein: Number,
        carbs: Number,
        fat: Number,
        fiber: Number
    },
    ingredients: [String],
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    isFeatured: {
        type: Boolean,
        default: false,
        index: true
    },
    isOffer: {
        type: Boolean,
        default: false,
        index: true
    },
    offerText: String,
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        index: true
    },
    numReviews: {
        type: Number,
        default: 0,
        min: 0
    },
    tags: {
        type: [String],
        index: true
    },
    brand: {
        type: String,
        index: true
    },
    sku: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    // SEO fields
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],
    // Sales metrics
    salesCount: {
        type: Number,
        default: 0
    },
    viewCount: {
        type: Number,
        default: 0
    },
    lastRestocked: Date
}, {
    timestamps: true,
    minimize: false
});

// ========================================
// COMPOUND INDEXES FOR COMMON QUERIES
// ========================================
// Optimized: Removed redundant single-field indexes, kept high-value compounds
productSchema.index({ category: 1, isActive: 1, price: 1 }); // Filtering
productSchema.index({ isActive: 1, isFeatured: -1 });        // Homepage
productSchema.index({ isActive: 1, isOffer: -1 });           // Offers page
productSchema.index({ isActive: 1, stock: 1 });              // Availability
productSchema.index({ createdAt: -1 });                      // New arrivals (simple sort)

// ========================================
// TEXT INDEX FOR SEARCH
// ========================================
productSchema.index({
    name: 'text',
    tags: 'text',
    brand: 'text'
}, {
    weights: {
        name: 10,
        tags: 5,
        brand: 3
    },
    name: 'product_text_index'
});

// ========================================
// VIRTUAL PROPERTIES
// ========================================

// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function () {
    if (this.originalPrice && this.originalPrice > this.price) {
        return Math.round(((this.originalPrice - this.price) / this.originalPrice) * 100);
    }
    return 0;
});

// Virtual for in stock status
productSchema.virtual('inStock').get(function () {
    return this.stock > 0;
});

// Virtual for low stock warning
productSchema.virtual('lowStock').get(function () {
    return this.stock > 0 && this.stock <= 10;
});

// Virtual for out of stock
productSchema.virtual('outOfStock').get(function () {
    return this.stock === 0;
});

// Virtual for savings amount
productSchema.virtual('savings').get(function () {
    if (this.originalPrice && this.originalPrice > this.price) {
        return this.originalPrice - this.price;
    }
    return 0;
});

// Virtual for average rating display
productSchema.virtual('ratingDisplay').get(function () {
    return this.rating.toFixed(1);
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function () {
    if (this.stock === 0) return 'Out of Stock';
    if (this.stock <= 10) return 'Low Stock';
    return 'In Stock';
});

// Virtual for popularity score (combination of sales and reviews)
productSchema.virtual('popularityScore').get(function () {
    return (this.salesCount * 2) + (this.numReviews * 5) + (this.rating * 10);
});

// ========================================
// INSTANCE METHODS
// ========================================

/**
 * Update stock
 */
productSchema.methods.updateStock = async function (quantity, operation = 'decrease') {
    if (operation === 'decrease') {
        if (this.stock < quantity) {
            throw new Error('Insufficient stock');
        }
        this.stock -= quantity;
    } else {
        this.stock += quantity;
        this.lastRestocked = new Date();
    }
    await this.save();
    return this;
};

/**
 * Increment view count
 */
productSchema.methods.incrementViews = async function () {
    this.viewCount += 1;
    await this.save();
    return this;
};

/**
 * Increment sales count
 */
productSchema.methods.incrementSales = async function (quantity = 1) {
    this.salesCount += quantity;
    await this.save();
    return this;
};

/**
 * Update rating
 */
productSchema.methods.updateRating = async function (newRating, newReviewCount) {
    this.rating = newRating;
    this.numReviews = newReviewCount;
    await this.save();
    return this;
};

/**
 * Check if product is available
 */
productSchema.methods.isAvailable = function (quantity = 1) {
    return this.isActive && this.stock >= quantity;
};

/**
 * Get related products
 */
productSchema.methods.getRelatedProducts = async function (limit = 5) {
    return await this.constructor.find({
        category: this.category,
        _id: { $ne: this._id },
        isActive: true,
        stock: { $gt: 0 }
    })
        .select('name slug price image rating')
        .limit(limit)
        .lean()
        .exec();
};

/**
 * Set as featured
 */
productSchema.methods.setFeatured = async function (featured = true) {
    this.isFeatured = featured;
    await this.save();
    return this;
};

/**
 * Set as offer
 */
productSchema.methods.setOffer = async function (offer = true, offerText = '') {
    this.isOffer = offer;
    if (offerText) this.offerText = offerText;
    await this.save();
    return this;
};

// ========================================
// STATIC METHODS
// ========================================

/**
 * Find active products
 */
productSchema.statics.findActive = function (options = {}) {
    const query = this.find({ isActive: true });

    if (options.category) {
        query.where({ category: options.category });
    }

    if (options.inStock) {
        query.where({ stock: { $gt: 0 } });
    }

    return query;
};

/**
 * Find featured products
 */
productSchema.statics.findFeatured = function (limit = 10) {
    return this.find({
        isActive: true,
        isFeatured: true,
        stock: { $gt: 0 }
    })
        .select('name slug price originalPrice image rating')
        .limit(limit)
        .lean()
        .exec();
};

/**
 * Find offer products
 */
productSchema.statics.findOffers = function (limit = 20) {
    return this.find({
        isActive: true,
        isOffer: true,
        stock: { $gt: 0 }
    })
        .select('name slug price originalPrice image offerText rating')
        .limit(limit)
        .lean()
        .exec();
};

/**
 * Find best sellers
 */
productSchema.statics.findBestSellers = function (limit = 10) {
    return this.find({
        isActive: true,
        stock: { $gt: 0 }
    })
        .sort({ salesCount: -1 })
        .select('name slug price image rating salesCount')
        .limit(limit)
        .lean()
        .exec();
};

/**
 * Find new arrivals
 */
productSchema.statics.findNewArrivals = function (limit = 10) {
    return this.find({
        isActive: true,
        stock: { $gt: 0 }
    })
        .sort({ createdAt: -1 })
        .select('name slug price image rating')
        .limit(limit)
        .lean()
        .exec();
};

/**
 * Find by category
 */
productSchema.statics.findByCategory = function (categoryId, options = {}) {
    const query = this.find({
        category: categoryId,
        isActive: true
    });

    if (options.inStock) {
        query.where({ stock: { $gt: 0 } });
    }

    if (options.sort) {
        query.sort(options.sort);
    }

    if (options.limit) {
        query.limit(options.limit);
    }

    return query;
};

/**
 * Search products (optimized with text index)
 */
productSchema.statics.searchProducts = function (searchTerm, options = {}) {
    const query = this.find({
        $text: { $search: searchTerm },
        isActive: true
    }, {
        score: { $meta: 'textScore' }
    }).sort({ score: { $meta: 'textScore' } });

    if (options.category) {
        query.where({ category: options.category });
    }

    if (options.inStock) {
        query.where({ stock: { $gt: 0 } });
    }

    if (options.limit) {
        query.limit(options.limit);
    }

    return query;
};

/**
 * Get low stock products
 */
productSchema.statics.findLowStock = function (threshold = 10) {
    return this.find({
        isActive: true,
        stock: { $gt: 0, $lte: threshold }
    })
        .select('name slug stock')
        .sort({ stock: 1 })
        .lean()
        .exec();
};

/**
 * Get out of stock products
 */
productSchema.statics.findOutOfStock = function () {
    return this.find({
        isActive: true,
        stock: 0
    })
        .select('name slug stock lastRestocked')
        .sort({ lastRestocked: 1 })
        .lean()
        .exec();
};

/**
 * Get product statistics
 */
productSchema.statics.getStats = async function () {
    return await this.aggregate([
        {
            $facet: {
                total: [{ $count: 'count' }],
                active: [
                    { $match: { isActive: true } },
                    { $count: 'count' }
                ],
                inStock: [
                    { $match: { stock: { $gt: 0 } } },
                    { $count: 'count' }
                ],
                outOfStock: [
                    { $match: { stock: 0 } },
                    { $count: 'count' }
                ],
                featured: [
                    { $match: { isFeatured: true } },
                    { $count: 'count' }
                ],
                totalValue: [
                    {
                        $group: {
                            _id: null,
                            value: { $sum: { $multiply: ['$price', '$stock'] } }
                        }
                    }
                ]
            }
        }
    ]);
};

/**
 * Get category statistics
 */
productSchema.statics.getCategoryStats = async function () {
    return await this.aggregate([
        {
            $group: {
                _id: '$category',
                count: { $sum: 1 },
                avgPrice: { $avg: '$price' },
                totalStock: { $sum: '$stock' }
            }
        },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'categoryInfo'
            }
        },
        {
            $unwind: '$categoryInfo'
        },
        {
            $project: {
                categoryName: '$categoryInfo.name',
                count: 1,
                avgPrice: { $round: ['$avgPrice', 2] },
                totalStock: 1
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
};

// ========================================
// CONSOLIDATED PRE-SAVE MIDDLEWARE
// ========================================

/**
 * Single optimized hook for all pre-save logic
 */
productSchema.pre('save', async function () {
    // 1. Generate slug
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    // 2. Generate SKU
    if (!this.sku && this.isNew) {
        const randomNum = Math.floor(Math.random() * 10000);
        const prefix = this.name.substring(0, 3).toUpperCase();
        this.sku = `${prefix}-${Date.now()}-${randomNum}`;
    }

    // 3. Set original price
    if (!this.originalPrice && this.isNew) {
        this.originalPrice = this.price;
    }

    // 4. Validate stock
    if (this.stock < 0) {
        throw new Error('Stock cannot be negative');
    }

    // 5. Ensure rating bounds
    if (this.rating < 0) this.rating = 0;
    if (this.rating > 5) this.rating = 5;
});

// ========================================
// POST-SAVE MIDDLEWARE
// ========================================

/**
 * Log product creation
 */
productSchema.post('save', function (doc, next) {
    if (doc.isNew) {
        console.log(`[PRODUCT] New product created: ${doc.name} (${doc._id})`);
    }
    next();
});

// ========================================
// PRE-REMOVE MIDDLEWARE
// ========================================

/**
 * Handle product removal
 */
productSchema.pre('remove', async function (next) {
    try {
        console.log(`[PRODUCT] Removing product: ${this.name} (${this._id})`);
        // You can add cleanup logic here (e.g., remove from carts, orders, etc.)
        next();
    } catch (error) {
        next(error);
    }
});

// ========================================
// QUERY HELPERS
// ========================================

/**
 * Filter only essential fields
 */
productSchema.query.essential = function () {
    return this.select('name slug price originalPrice image rating stock isActive');
};

/**
 * Filter only card display fields
 */
productSchema.query.cardDisplay = function () {
    return this.select('name slug price originalPrice image rating numReviews isFeatured isOffer offerText');
};

/**
 * Filter only list display fields
 */
productSchema.query.listDisplay = function () {
    return this.select('name slug price stock category brand sku isActive');
};

// ========================================
// JSON TRANSFORMATION
// ========================================

productSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret.__v;
        ret.id = ret._id;
        return ret;
    }
});

productSchema.set('toObject', {
    virtuals: true,
    transform: function (doc, ret) {
        ret.id = ret._id;
        return ret;
    }
});

// ========================================
// COMBO SCHEMA (DISCRIMINATOR)
// ========================================
const comboSchema = new mongoose.Schema({
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],
    comboPrice: {
        type: Number,
        required: true,
        min: 0
    }
});

// ========================================
// EXPORT MODELS
// ========================================
const Product = mongoose.model('Product', productSchema);
const Combo = Product.discriminator('Combo', comboSchema);

module.exports = { Product, Combo };