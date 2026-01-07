const mongoose = require('mongoose');
// ========================================
const settingSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        index: true,
        default: 'site_settings'
    },
    website_name: {
        type: String,
        default: 'MANSARA Foods'
    },
    contact_email: {
        type: String,
        default: 'contact@mansarafoods.com'
    },
    phone_number: String,
    address: String,
    facebook_url: String,
    instagram_url: String,
    twitter_url: String,
    whatsapp_number: String,
    currency: {
        type: String,
        default: 'INR'
    },
    timezone: {
        type: String,
        default: 'Asia/Kolkata'
    },
    metaDescription: String,
    metaKeywords: [String],
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