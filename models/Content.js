const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
        unique: true
    },
    sections: {
        type: Map,
        of: String,
        default: {}
    }
}, { timestamps: true });

module.exports = mongoose.model('Content', contentSchema);
