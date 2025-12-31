const mongoose = require('mongoose');

const tempUserSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    otp: {
        type: String,
        required: true,
    },
    otpExpire: {
        type: Date,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Automatically delete after 1 hour (3600 seconds)
    }
}, {
    timestamps: true,
});

module.exports = mongoose.model('TempUser', tempUserSchema);
