const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    type: { type: String, enum: ['Home', 'Work', 'Other'], default: 'Home' },
    street: String,
    city: String,
    state: String,
    zip: String,
    isDefault: { type: Boolean, default: false }
});

const cartItemSchema = new mongoose.Schema({
    id: String,
    type: { type: String, enum: ['product', 'combo'] },
    quantity: Number,
    price: Number,
    name: String,
    image: String
}, { _id: false });

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // For future auth
    phone: String,
    avatar: String,
    addresses: [addressSchema],
    cart: [cartItemSchema],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    isVerified: { type: Boolean, default: false },
    otp: String,
    otpExpire: Date,
    // Admin specific fields (optional)
    isAdmin: { type: Boolean, default: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    joinDate: { type: Date, default: Date.now },
    status: { type: String, enum: ['Active', 'Inactive', 'Blocked'], default: 'Active' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
