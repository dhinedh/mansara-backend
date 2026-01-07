const mongoose = require('mongoose');
// ========================================
const bannerSchema = new mongoose.Schema({
    page: {
        type: String,
        enum: ['home', 'products', 'about', 'contact'],
        required: true,
        index: true
    },
    image: {
        type: String,
        required: true
    },
    title: String,
    subtitle: String,
    link: String,
    order: {
        type: Number,
        default: 0,
        index: true
    },
    active: {
        type: Boolean,
        default: true,
        index: true
    }
}, { timestamps: true });

bannerSchema.index({ page: 1, active: 1, order: 1 });

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;