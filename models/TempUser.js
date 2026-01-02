const mongoose = require('mongoose');
// ========================================
const tempUserSchema = mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true
    },
    password: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    whatsapp: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    otp: {
        type: String,
        required: true,
        index: true
    },
    otpExpire: {
        type: Date,
        required: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600, // Auto-delete after 1 hour
        index: true
    }
}, {
    timestamps: true
});

// Compound index for OTP verification
tempUserSchema.index({ email: 1, otp: 1, otpExpire: 1 });

const TempUser = mongoose.model('TempUser', tempUserSchema);