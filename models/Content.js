const mongoose = require('mongoose');
const contentSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    sections: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    isPublished: {
        type: Boolean,
        default: true,
        index: true
    }
}, { timestamps: true });

contentSchema.index({ slug: 1, isPublished: 1 });

const Content = mongoose.model('Content', contentSchema);

module.exports = Content;