const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ========================================
// SUB-SCHEMAS
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
// USER SCHEMA WITH OPTIMIZED INDEXES
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
        index: true, // Primary lookup field
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    password: { 
        type: String,
        select: false // Don't include password in queries by default
    },
    phone: { 
        type: String,
        trim: true,
        index: true
    },
    whatsapp: { 
        type: String, 
        required: true,
        trim: true,
        index: true // Index for WhatsApp lookups
    },
    avatar: String,
    addresses: [addressSchema],
    cart: [cartItemSchema],
    
    // Password reset fields
    resetPasswordToken: { 
        type: String,
        index: true // Index for password reset lookups
    },
    resetPasswordExpire: { 
        type: Date,
        index: true
    },
    
    // Verification fields
    isVerified: { 
        type: Boolean, 
        default: false,
        index: true
    },
    otp: String,
    otpExpire: Date,
    
    // Role and admin fields
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
    
    // Status tracking
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
    
    // Activity tracking
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
// COMPOUND INDEXES
// ========================================
// Index for admin queries
userSchema.index({ role: 1, status: 1 });

// Index for verified active users
userSchema.index({ isVerified: 1, status: 1 });

// Index for password reset queries
userSchema.index({ resetPasswordToken: 1, resetPasswordExpire: 1 });

// ========================================
// VIRTUAL PROPERTIES
// ========================================
// Virtual for full cart total
userSchema.virtual('cartTotal').get(function() {
    return this.cart.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
});

// Virtual for cart item count
userSchema.virtual('cartItemCount').get(function() {
    return this.cart.reduce((count, item) => count + item.quantity, 0);
});

// Virtual for average order value
userSchema.virtual('averageOrderValue').get(function() {
    if (this.totalOrders > 0) {
        return Math.round(this.totalSpent / this.totalOrders);
    }
    return 0;
});

// ========================================
// INSTANCE METHODS
// ========================================
// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    if (!this.password) return false;
    return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = async function() {
    this.lastLogin = new Date();
    await this.save();
};

// Add item to cart
userSchema.methods.addToCart = async function(item) {
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

// Remove item from cart
userSchema.methods.removeFromCart = async function(itemId, itemType) {
    this.cart = this.cart.filter(
        item => !(item.id === itemId && item.type === itemType)
    );
    await this.save();
    return this.cart;
};

// Clear cart
userSchema.methods.clearCart = async function() {
    this.cart = [];
    await this.save();
};

// Update order stats
userSchema.methods.updateOrderStats = async function(orderTotal) {
    this.totalOrders += 1;
    this.totalSpent += orderTotal;
    this.lastOrderDate = new Date();
    await this.save();
};

// Get default address
userSchema.methods.getDefaultAddress = function() {
    return this.addresses.find(addr => addr.isDefault) || this.addresses[0];
};

// Set default address
userSchema.methods.setDefaultAddress = async function(addressId) {
    this.addresses.forEach(addr => {
        addr.isDefault = addr._id.toString() === addressId.toString();
    });
    await this.save();
};

// ========================================
// STATIC METHODS
// ========================================
// Find by email (case-insensitive)
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

// Find active users
userSchema.statics.findActive = function() {
    return this.find({ status: 'Active', isVerified: true });
};

// Find admins
userSchema.statics.findAdmins = function() {
    return this.find({ role: 'admin' });
};

// Search users
userSchema.statics.searchUsers = function(searchTerm) {
    return this.find({
        $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { email: { $regex: searchTerm, $options: 'i' } },
            { phone: { $regex: searchTerm, $options: 'i' } }
        ]
    });
};

// ========================================
// PRE-SAVE MIDDLEWARE
// ========================================
// Hash password before saving (only if modified)
userSchema.pre('save', async function(next) {
    // Only hash password if it's modified or new
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Ensure only one default address
userSchema.pre('save', function(next) {
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
        
        // If no default, set first address as default
        if (defaultCount === 0) {
            this.addresses[0].isDefault = true;
        }
    }
    next();
});

// ========================================
// POST-SAVE MIDDLEWARE
// ========================================
// Remove sensitive data from toJSON
userSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
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