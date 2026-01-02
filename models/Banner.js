const mongoose = require('mongoose');
// ========================================
const bannerSchema = new mongoose.Schema({
    page: {
        type: String,
        required: true,
        index: true
    },
    image: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    subtitle: {
        type: String,
        default: '',
        trim: true
    },
    link: {
        type: String,
        default: '',
        trim: true
    },
    active: {
        type: Boolean,
        default: true,
        index: true
    },
    order: {
        type: Number,
        default: 0,
        index: true
    }
}, { timestamps: true });

// Compound index for active banners by page
bannerSchema.index({ page: 1, active: 1, order: 1 });

const Banner = mongoose.model('Banner', bannerSchema);

module.exports = Banner;