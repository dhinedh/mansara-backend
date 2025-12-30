const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // Optional, can enable linking
    name: String, // Snapshot of name
    quantity: Number,
    price: Number
});

const trackingStepSchema = new mongoose.Schema({
    status: { type: String, enum: ['Ordered', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'] },
    date: Date,
    completed: { type: Boolean, default: false }
});

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Custom ID format #ORD... can be handled manually or just use _id
    orderId: { type: String, unique: true },
    date: { type: Date, default: Date.now },
    total: Number,
    paymentStatus: { type: String, enum: ['Paid', 'Failed', 'Pending'], default: 'Pending' },
    orderStatus: { type: String, enum: ['Ordered', 'Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'], default: 'Ordered' },
    items: [orderItemSchema],
    deliveryAddress: {
        street: String,
        city: String,
        state: String,
        zip: String
    },
    paymentMethod: String,
    trackingSteps: [trackingStepSchema]
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
