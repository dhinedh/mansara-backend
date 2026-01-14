const mongoose = require('mongoose');

// ========================================
// PERFORMANCE OPTIMIZATIONS ADDED:
// 1. Optimized indexes for common queries
// 2. Compound indexes for frequently combined fields
// 3. Better instance methods
// 4. Improved static methods for analytics
// 5. Efficient virtuals
// 6. Better pre-save hooks
// ========================================

// ========================================
// SUB-SCHEMAS
// ========================================
const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    // Store product snapshot at order time
    image: String,
    weight: String
}, { _id: true });

const trackingStepSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['Ordered', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    completed: {
        type: Boolean,
        default: false
    },
    notes: String,
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { _id: true });

// ========================================
// ORDER SCHEMA WITH OPTIMIZED INDEXES
// ========================================
const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true // Critical for user order lookups
    },
    orderId: {
        type: String,
        unique: true,
        required: true,
        index: true // For order tracking
    },
    date: {
        type: Date,
        default: Date.now,
        index: true
    },
    total: {
        type: Number,
        required: true,
        min: 0,
        index: true // For revenue queries
    },
    paymentStatus: {
        type: String,
        enum: ['Paid', 'Failed', 'Pending'],
        default: 'Pending',
        index: true // For payment tracking
    },
    orderStatus: {
        type: String,
        enum: ['Ordered', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled', 'Closed'],
        default: 'Ordered',
        index: true // Critical for order filtering
    },
    feedbackStatus: {
        type: String,
        enum: ['Pending', 'Received', 'Not Received'],
        default: 'Pending',
        index: true
    },
    feedbackDate: Date,
    items: {
        type: [orderItemSchema],
        validate: [arrayMinLength, 'Order must have at least one item']
    },
    deliveryAddress: {
        firstName: { type: String, required: true },
        lastName: { type: String },
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        zip: { type: String, required: true },
        phone: { type: String, required: true },
        whatsapp: String
    },
    paymentMethod: {
        type: String,
        enum: ['Cash on Delivery', 'UPI', 'Card', 'Net Banking', 'Online'],
        default: 'Cash on Delivery',
        index: true
    },
    trackingSteps: [trackingStepSchema],
    estimatedDeliveryDate: {
        type: Date,
        index: true
    },
    actualDeliveryDate: Date,
    notes: String,

    // Additional tracking fields
    cancellationReason: String,
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelledAt: Date,

    // Notifications
    notificationsSent: {
        orderConfirmed: { type: Boolean, default: false },
        shipped: { type: Boolean, default: false },
        delivered: { type: Boolean, default: false }
    },

    // Invoice
    invoiceNumber: String,
    invoiceGenerated: { type: Boolean, default: false }
}, {
    timestamps: true,
    minimize: false
});

// Validator for items array
function arrayMinLength(val) {
    return val && val.length > 0;
}

// ========================================
// COMPOUND INDEXES FOR COMMON QUERIES
// ========================================
// User + order date (for user order history)
orderSchema.index({ user: 1, createdAt: -1 });

// User + status (for active orders)
orderSchema.index({ user: 1, orderStatus: 1 });

// Order status + date (for admin filtering)
orderSchema.index({ orderStatus: 1, createdAt: -1 });

// Payment status + order status
orderSchema.index({ paymentStatus: 1, orderStatus: 1 });

// Estimated delivery date + order status
orderSchema.index({ estimatedDeliveryDate: 1, orderStatus: 1 });

// Date range queries (for analytics)
orderSchema.index({ createdAt: -1, orderStatus: 1 });

// Text index for order ID search
orderSchema.index({ orderId: 'text' });

// ========================================
// VIRTUAL PROPERTIES
// ========================================
// Virtual for subtotal
orderSchema.virtual('subtotal').get(function () {
    return this.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
});

// Virtual for total items count
orderSchema.virtual('itemCount').get(function () {
    return this.items.reduce((count, item) => count + item.quantity, 0);
});

// Virtual for delivery status
orderSchema.virtual('isDelivered').get(function () {
    return this.orderStatus === 'Delivered';
});

// Virtual for cancellation status
orderSchema.virtual('isCancelled').get(function () {
    return this.orderStatus === 'Cancelled';
});

// Virtual for days until delivery
orderSchema.virtual('daysUntilDelivery').get(function () {
    if (!this.estimatedDeliveryDate) return null;
    const now = new Date();
    const delivery = new Date(this.estimatedDeliveryDate);
    const diffTime = delivery - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// Virtual for order age (in days)
orderSchema.virtual('orderAge').get(function () {
    const now = new Date();
    const orderDate = new Date(this.createdAt);
    const diffTime = now - orderDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
});

// ========================================
// INSTANCE METHODS
// ========================================

/**
 * Update order status
 */
orderSchema.methods.updateStatus = async function (newStatus, notes = '', updatedBy = null) {
    // Define status order for tracking logic
    const statusOrder = ['Ordered', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered'];
    const currentStatusIndex = statusOrder.indexOf(this.orderStatus);
    const newStatusIndex = statusOrder.indexOf(newStatus);

    // Validation
    if (newStatus !== 'Cancelled' && this.orderStatus !== 'Cancelled' && newStatusIndex < currentStatusIndex) {
        throw new Error(`Cannot revert status from ${this.orderStatus} to ${newStatus}`);
    }

    this.orderStatus = newStatus;

    if (newStatus === 'Cancelled') {
        const cancelStep = this.trackingSteps.find(s => s.status === 'Cancelled');
        if (cancelStep) {
            cancelStep.completed = true;
            cancelStep.date = new Date();
            if (notes) cancelStep.notes = notes;
            if (updatedBy) cancelStep.updatedBy = updatedBy;
        }
        this.cancelledAt = new Date();
        if (updatedBy) this.cancelledBy = updatedBy;
        if (notes) this.cancellationReason = notes;
    } else if (newStatusIndex !== -1) {
        // Mark all steps up to new status as completed
        this.trackingSteps.forEach(step => {
            const stepIndex = statusOrder.indexOf(step.status);
            if (stepIndex !== -1 && stepIndex <= newStatusIndex) {
                if (!step.completed) {
                    step.completed = true;
                    step.date = new Date();
                }
                // Update notes/user for the target step only
                if (step.status === newStatus) {
                    if (notes) step.notes = notes;
                    if (updatedBy) step.updatedBy = updatedBy;
                }
            }
        });
    }

    // Set actual delivery date if delivered
    if (newStatus === 'Delivered') {
        this.actualDeliveryDate = new Date();
    }

    await this.save();
    return this;
};

/**
 * Cancel order
 */
orderSchema.methods.cancel = async function (reason, cancelledBy) {
    this.orderStatus = 'Cancelled';
    this.cancellationReason = reason;
    this.cancelledBy = cancelledBy;
    this.cancelledAt = new Date();

    // Update tracking step
    const cancelStep = this.trackingSteps.find(s => s.status === 'Cancelled');
    if (cancelStep) {
        cancelStep.completed = true;
        cancelStep.date = new Date();
        cancelStep.notes = reason;
        cancelStep.updatedBy = cancelledBy;
    }

    await this.save();
    return this;
};

/**
 * Calculate delivery time
 */
orderSchema.methods.calculateDeliveryTime = function () {
    if (!this.actualDeliveryDate || !this.date) return null;

    const diffTime = this.actualDeliveryDate - this.date;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

/**
 * Get current tracking step
 */
orderSchema.methods.getCurrentStep = function () {
    return this.trackingSteps.find(step =>
        step.status === this.orderStatus
    );
};

/**
 * Check if order can be cancelled
 */
orderSchema.methods.canBeCancelled = function () {
    const nonCancellableStatuses = ['Delivered', 'Cancelled', 'Shipped'];
    return !nonCancellableStatuses.includes(this.orderStatus);
};

/**
 * Generate invoice number
 */
orderSchema.methods.generateInvoice = async function () {
    if (!this.invoiceNumber) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        this.invoiceNumber = `INV-${year}${month}-${this.orderId}`;
        this.invoiceGenerated = true;
        await this.save();
    }
    return this.invoiceNumber;
};

// ========================================
// STATIC METHODS
// ========================================

/**
 * Find orders by user
 */
orderSchema.statics.findByUser = function (userId, options = {}) {
    const query = this.find({ user: userId });

    if (options.status) {
        query.where({ orderStatus: options.status });
    }

    if (options.limit) {
        query.limit(options.limit);
    }

    return query.sort({ createdAt: -1 });
};

/**
 * Find pending orders
 */
orderSchema.statics.findPending = function () {
    return this.find({
        orderStatus: { $in: ['Ordered', 'Processing'] }
    }).sort({ createdAt: -1 });
};

/**
 * Find orders for delivery today
 */
orderSchema.statics.findForDeliveryToday = function () {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.find({
        estimatedDeliveryDate: {
            $gte: today,
            $lt: tomorrow
        },
        orderStatus: { $in: ['Processing', 'Shipped', 'Out for Delivery'] }
    });
};

/**
 * Revenue analytics
 */
orderSchema.statics.getRevenue = async function (startDate, endDate) {
    const result = await this.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate },
                orderStatus: { $ne: 'Cancelled' }
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$total' },
                orderCount: { $sum: 1 },
                averageOrderValue: { $avg: '$total' }
            }
        }
    ]);

    return result[0] || { totalRevenue: 0, orderCount: 0, averageOrderValue: 0 };
};

/**
 * Get order statistics
 */
orderSchema.statics.getStats = async function () {
    return await this.aggregate([
        {
            $facet: {
                total: [{ $count: 'count' }],
                byStatus: [
                    { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
                ],
                revenue: [
                    { $match: { orderStatus: { $ne: 'Cancelled' } } },
                    { $group: { _id: null, total: { $sum: '$total' } } }
                ],
                avgOrderValue: [
                    { $match: { orderStatus: { $ne: 'Cancelled' } } },
                    { $group: { _id: null, avg: { $avg: '$total' } } }
                ]
            }
        }
    ]);
};

// ========================================
// PRE-SAVE MIDDLEWARE
// ========================================

/**
 * Generate order ID if not exists
 */
orderSchema.pre('save', async function () {
    if (!this.orderId) {
        this.orderId = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`;
    }
});

/**
 * Set estimated delivery date if not set
 */
orderSchema.pre('save', async function () {
    if (!this.estimatedDeliveryDate && this.isNew) {
        const estimatedDate = new Date();
        estimatedDate.setDate(estimatedDate.getDate() + 5); // Default 5 days
        this.estimatedDeliveryDate = estimatedDate;
    }
});

/**
 * Initialize tracking steps
 */
orderSchema.pre('save', async function () {
    if (this.isNew && (!this.trackingSteps || this.trackingSteps.length === 0)) {
        this.trackingSteps = [
            { status: 'Ordered', completed: true, date: new Date() },
            { status: 'Processing', completed: false },
            { status: 'Shipped', completed: false },
            { status: 'Out for Delivery', completed: false },
            { status: 'Delivered', completed: false }
        ];
    }
});

// ========================================
// POST-SAVE MIDDLEWARE
// ========================================

/**
 * Log order creation
 */
orderSchema.post('save', function (doc, next) {
    if (doc.isNew) {
        console.log(`[ORDER] New order created: ${doc.orderId} - User: ${doc.user}`);
    }
    next();
});

// ========================================
// JSON TRANSFORMATION
// ========================================
orderSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret.__v;
        ret.id = ret._id;
        return ret;
    }
});

orderSchema.set('toObject', {
    virtuals: true,
    transform: function (doc, ret) {
        ret.id = ret._id;
        return ret;
    }
});

// ========================================
// EXPORT MODEL
// ========================================
module.exports = mongoose.model('Order', orderSchema);