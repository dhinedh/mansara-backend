const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ========================================
// ADDRESS SCHEMA
// ========================================
const addressSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['Home', 'Work', 'Other'],
        default: 'Home'
    },
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zip: { type: String, trim: true },
    isDefault: { type: Boolean, default: false }
}, { _id: true });

// ========================================
// CART ITEM SCHEMA
// ========================================
const cartItemSchema = new mongoose.Schema({
    id: { type: String, required: true },
    type: {
        type: String,
        enum: ['product', 'combo'],
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    },
    name: { type: String, required: true },
    image: String
}, { _id: false });

// ========================================
// USER SCHEMA
// ========================================
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        select: false
    },
    phone: {
        type: String,
        trim: true,
        index: true
    },
    whatsapp: {
        type: String,
        trim: true,
        index: true
    },
    avatar: String,

    // GOOGLE AUTH FIELDS
    picture: String,
    googleId: {
        type: String,
        unique: true,
        sparse: true,
        index: true
    },
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local',
        index: true
    },

    addresses: [addressSchema],
    cart: [cartItemSchema],

    resetPasswordToken: {
        type: String,
        index: true
    },
    resetPasswordExpire: {
        type: Date,
        index: true
    },

    isVerified: {
        type: Boolean,
        default: false,
        index: true
    },
    otp: String,
    otpExpire: Date,

    isAdmin: {
        type: Boolean,
        default: false,
        index: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user',
        index: true
    },

    joinDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['Active', 'Inactive', 'Blocked'],
        default: 'Active',
        index: true
    },

    lastLogin: {
        type: Date,
        index: true
    },
    lastOrderDate: Date,
    totalOrders: {
        type: Number,
        default: 0
    },
    totalSpent: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    minimize: false
});

// ========================================
// INDEXES
// ========================================
userSchema.index({ role: 1, status: 1 });
userSchema.index({ isVerified: 1, status: 1 });
userSchema.index({ resetPasswordToken: 1, resetPasswordExpire: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ authProvider: 1 });

// ========================================
// VIRTUALS
// ========================================
userSchema.virtual('cartTotal').get(function () {
    if (!this.cart || !Array.isArray(this.cart)) return 0;
    return this.cart.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
});

userSchema.virtual('cartItemCount').get(function () {
    if (!this.cart || !Array.isArray(this.cart)) return 0;
    return this.cart.reduce((count, item) => count + item.quantity, 0);
});

userSchema.virtual('averageOrderValue').get(function () {
    if (this.totalOrders > 0) {
        return Math.round(this.totalSpent / this.totalOrders);
    }
    return 0;
});

// ========================================
// INSTANCE METHODS
// ========================================

userSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.updateLastLogin = async function () {
    this.lastLogin = new Date();
    await this.save();
};

userSchema.methods.addToCart = async function (item) {
    const existingItemIndex = this.cart.findIndex(
        i => i.id === item.id && i.type === item.type
    );

    if (existingItemIndex > -1) {
        this.cart[existingItemIndex].quantity += item.quantity;
    } else {
        this.cart.push(item);
    }

    await this.save();
    return this.cart;
};

userSchema.methods.removeFromCart = async function (itemId, itemType) {
    this.cart = this.cart.filter(
        item => !(item.id === itemId && item.type === itemType)
    );
    await this.save();
    return this.cart;
};

userSchema.methods.clearCart = async function () {
    this.cart = [];
    await this.save();
};

userSchema.methods.updateOrderStats = async function (orderTotal) {
    this.totalOrders += 1;
    this.totalSpent += orderTotal;
    this.lastOrderDate = new Date();
    await this.save();
};

userSchema.methods.getDefaultAddress = function () {
    return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
};

userSchema.methods.setDefaultAddress = async function (addressId) {
    this.addresses.forEach(addr => {
        addr.isDefault = addr._id.toString() === addressId.toString();
    });
    await this.save();
};

// ========================================
// STATIC METHODS
// ========================================

userSchema.statics.findByEmail = function (email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findActive = function () {
    return this.find({ status: 'Active', isVerified: true });
};

userSchema.statics.findAdmins = function () {
    return this.find({ role: 'admin' });
};

userSchema.statics.searchUsers = function (searchTerm) {
    return this.find({
        $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } }
        ]
    });
};

// ========================================
// PRE-SAVE MIDDLEWARE (FIXED!)
// ========================================

/**
 * Hash password before saving
 * IMPORTANT: Only hash if password is modified AND password exists
 * Google users don't have passwords, so skip hashing for them
 */
userSchema.pre('save', async function () {
    // 1. If password is not modified, move on
    if (!this.isModified('password')) {
        return;
    }

    // 2. If password is empty (e.g. Google Auth user), move on
    if (!this.password) {
        return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

/**
 * Ensure only one default address
 */
userSchema.pre('save', async function () {
    if (this.addresses && this.addresses.length > 0) {
        const defaultCount = this.addresses.filter(addr => addr.isDefault).length;

        // If multiple defaults, keep only the first one
        if (defaultCount > 1) {
            let foundFirst = false;
            this.addresses.forEach(addr => {
                if (addr.isDefault && !foundFirst) {
                    foundFirst = true;
                } else {
                    addr.isDefault = false;
                }
            });
        }

        // If no default, make first one default
        if (defaultCount === 0) {
            this.addresses[0].isDefault = true;
        }
    }
});

// ========================================
// JSON TRANSFORMATION
// ========================================

userSchema.set('toJSON', {
    virtuals: true,
    transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        delete ret.otp;
        delete ret.otpExpire;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpire;
        return ret;
    }
});

// ========================================
// EXPORT MODEL
// ========================================

module.exports = mongoose.model('User', userSchema);