const mongoose = require('mongoose');
const contentSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true,
        lowercase: true,
        trim: true
    },
    sections: {
        type: Map,
        of: String,
        default: {}
    },
    isPublished: {
        type: Boolean,
        default: true,
        index: true
    }
}, { timestamps: true });

const Content = mongoose.model('Content', contentSchema);

module.exports = Content;