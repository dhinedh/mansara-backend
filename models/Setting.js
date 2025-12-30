const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    key: {
        type: String, // 'site_settings'
        required: true,
        unique: true
    },
    website_name: { type: String, default: 'MANSARA Foods' },
    contact_email: { type: String, default: 'contact@mansarafoods.com' },
    phone_number: { type: String, default: '' },
    address: { type: String, default: '' },
    facebook_url: { type: String, default: '' },
    instagram_url: { type: String, default: '' },
    twitter_url: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Setting', settingSchema);
