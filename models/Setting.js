const mongoose = require('mongoose');
// ========================================
const settingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    website_name: {
        type: String,
        default: 'MANSARA Foods'
    },
    contact_email: {
        type: String,
        default: 'contact@mansarafoods.com',
        lowercase: true,
        trim: true
    },
    phone_number: {
        type: String,
        default: '',
        trim: true
    },
    address: {
        type: String,
        default: '',
        trim: true
    },
    facebook_url: {
        type: String,
        default: '',
        trim: true
    },
    instagram_url: {
        type: String,
        default: '',
        trim: true
    },
    twitter_url: {
        type: String,
        default: '',
        trim: true
    },
    whatsapp_number: {
        type: String,
        default: '',
        trim: true
    },
    // Business settings
    currency: {
        type: String,
        default: 'INR'
    },
    timezone: {
        type: String,
        default: 'Asia/Kolkata'
    },
    // SEO settings
    metaDescription: String,
    metaKeywords: [String],
    // Shipping settings
    freeShippingThreshold: {
        type: Number,
        default: 0
    },
    defaultShippingCharge: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);

module.exports = Setting;