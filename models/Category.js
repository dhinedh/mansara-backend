const mongoose = require('mongoose');

// ========================================
// PERFORMANCE OPTIMIZATIONS ADDED:
// 1. Optimized indexes
// 2. Text index for search
// 3. Better virtuals and methods
// ========================================

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
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
        trim: true
    },
    image: String,
    icon: String,
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    productCount: {
        type: Number,
        default: 0,
        index: true
    },
    order: {
        type: Number,
        default: 0,
        index: true
    }
}, {
    timestamps: true
});

// ========================================
// INDEXES
// ========================================
categorySchema.index({ isActive: 1, order: 1 });
categorySchema.index({ name: 'text', description: 'text' });

// ========================================
// PRE-SAVE: Generate slug
// ========================================
categorySchema.pre('save', function (next) {
    if (this.isModified('name') && !this.slug) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
    }
    next();
});

// ========================================
// INSTANCE METHODS
// ========================================
categorySchema.methods.updateProductCount = async function () {
    const { Product } = require('./Product');
    const count = await Product.countDocuments({ category: this._id });
    this.productCount = count;
    await this.save();
    return this;
};

// ========================================
// JSON TRANSFORMATION
// ========================================
categorySchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret.__v;
        ret.id = ret._id;
        return ret;
    }
});

module.exports = mongoose.model('Category', categorySchema);