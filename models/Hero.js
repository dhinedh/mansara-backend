const mongoose = require('mongoose');

const heroSchema = new mongoose.Schema({
    key: { // 'home', 'newArrivals', 'homeSettings', etc.
        type: String,
        required: true,
        unique: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Hero', heroSchema);
