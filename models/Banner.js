const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
    page: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    subtitle: {
        type: String,
        default: ''
    },
    link: {
        type: String,
        default: ''
    },
    active: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Banner', bannerSchema);
