const mongoose = require('mongoose');

// ========================================
// PRODUCT SCHEMA WITH OPTIMIZED INDEXES
// ========================================
const productSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true, // Explicit index for fast lookups
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        index: true // Index for search
    },
    category: {
        type: String,
        required: true,
        index: true // Index for filtering by category
    },
    sub_category: {
        type: String,
        index: true // Index for subcategory filtering
    },
    price: {
        type: Number,
        required: true,
        index: true // Index for price sorting/filtering
    },
    offerPrice: {
        type: Number,
        index: true
    },
    image: String,
    images: [String],
    video: String, // URL to product video
    description: String,
    ingredients: String,
    howToUse: String,
    storage: String,
    weight: String,
    isOffer: {
        type: Boolean,
        default: false,
        index: true // Index for offer filtering
    },
    rating: {
        type: Number,
        default: 0,
        index: true
    },
    numReviews: {
        type: Number,
        default: 0
    },
    isNewArrival: {
        type: Boolean,
        default: false,
        index: true // Index for new arrivals
    },
    isFeatured: {
        type: Boolean,
        default: false,
        index: true // Index for featured products
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true // Index for active products
    },
    stock: {
        type: Number,
        default: 0,
        index: true // Index for stock filtering
    },
    highlights: [String],
    nutrition: String,
    compliance: String
}, {
    timestamps: true,
    // Optimize document size
    minimize: false,
    // Add version key for optimistic concurrency
    versionKey: '__v'
});

// ========================================
// COMPOUND INDEXES FOR COMMON QUERIES
// ========================================
// Index for category + active products
productSchema.index({ category: 1, isActive: 1 });

// Index for featured + active products
productSchema.index({ isFeatured: 1, isActive: 1 });

// Index for new arrivals + active
productSchema.index({ isNewArrival: 1, isActive: 1 });

// Index for offers + active
productSchema.index({ isOffer: 1, isActive: 1 });

// Index for price range queries with category
productSchema.index({ category: 1, price: 1 });

// Index for sorting by creation date (newest first)
productSchema.index({ createdAt: -1 });

// Text index for search functionality
productSchema.index({
    name: 'text',
    description: 'text',
    ingredients: 'text'
}, {
    weights: {
        name: 10,        // Name is most important
        description: 5,   // Description is moderately important
        ingredients: 2    // Ingredients is least important
    }
});

// ========================================
// VIRTUAL PROPERTIES
// ========================================
// Virtual for discount percentage
productSchema.virtual('discountPercentage').get(function () {
    if (this.offerPrice && this.price > this.offerPrice) {
        return Math.round(((this.price - this.offerPrice) / this.price) * 100);
    }
    return 0;
});

// Virtual for in stock status
productSchema.virtual('inStock').get(function () {
    return this.stock > 0;
});

// ========================================
// INSTANCE METHODS
// ========================================
// Method to decrease stock
productSchema.methods.decreaseStock = async function (quantity) {
    if (this.stock >= quantity) {
        this.stock -= quantity;
        await this.save();
        return true;
    }
    return false;
};

// Method to increase stock
productSchema.methods.increaseStock = async function (quantity) {
    this.stock += quantity;
    await this.save();
};

// ========================================
// STATIC METHODS
// ========================================
// Find active products
productSchema.statics.findActive = function () {
    return this.find({ isActive: true });
};

// Find products by category
productSchema.statics.findByCategory = function (category) {
    return this.find({ category, isActive: true });
};

// Find featured products
productSchema.statics.findFeatured = function (limit = 10) {
    return this.find({ isFeatured: true, isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit);
};

// ========================================
// PRE-SAVE MIDDLEWARE
// ========================================
// Auto-generate slug if not provided
productSchema.pre('save', async function () {
    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
});

// ========================================
// COMBO SCHEMA WITH INDEXES
// ========================================
const comboSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true,
        lowercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    products: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        index: true
    }],
    originalPrice: {
        type: Number,
        index: true
    },
    comboPrice: {
        type: Number,
        required: true,
        index: true
    },
    image: String,
    images: [String],
    description: String,
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
    stock: {
        type: Number,
        default: 0,
        index: true
    }
}, {
    timestamps: true,
    minimize: false
});

// Compound index for featured combos
comboSchema.index({ isFeatured: 1, isActive: 1 });

// Index for sorting by date
comboSchema.index({ createdAt: -1 });

// Virtual for savings
comboSchema.virtual('savings').get(function () {
    if (this.originalPrice && this.comboPrice) {
        return this.originalPrice - this.comboPrice;
    }
    return 0;
});

comboSchema.virtual('savingsPercentage').get(function () {
    if (this.originalPrice && this.comboPrice && this.originalPrice > this.comboPrice) {
        return Math.round(((this.originalPrice - this.comboPrice) / this.originalPrice) * 100);
    }
    return 0;
});

// Auto-generate slug
comboSchema.pre('save', async function () {
    if (!this.slug && this.name) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    }
});

// ========================================
// INSTANCE METHODS FOR COMBO
// ========================================
// Method to decrease stock
comboSchema.methods.decreaseStock = async function (quantity) {
    if (this.stock >= quantity) {
        this.stock -= quantity;
        await this.save();
        return true;
    }
    return false;
};

// Method to increase stock
comboSchema.methods.increaseStock = async function (quantity) {
    this.stock += quantity;
    await this.save();
};

// ========================================
// JSON TRANSFORMATION
// ========================================
const jsonOptions = {
    virtuals: true,
    transform: function (doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
    }
};

productSchema.set('toJSON', jsonOptions);
comboSchema.set('toJSON', jsonOptions);

// ========================================
// EXPORT MODELS
// ========================================
module.exports = {
    Product: mongoose.model('Product', productSchema),
    Combo: mongoose.model('Combo', comboSchema)
};