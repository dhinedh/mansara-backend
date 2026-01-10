const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    whatsapp: {
        type: String,
        required: true,
        trim: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending',
        index: true
    },
    sentAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate subscriptions for same product/phone
notificationSchema.index({ product: 1, whatsapp: 1, status: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
