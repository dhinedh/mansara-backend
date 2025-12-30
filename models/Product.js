const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    sub_category: { type: String }, // Added to fix frontend issue
    price: { type: Number, required: true },
    offerPrice: Number,
    image: String, // URL
    description: String,
    ingredients: String,
    howToUse: String,
    storage: String,
    weight: String,
    isOffer: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    stock: { type: Number, default: 0 },
    highlights: [String],
    nutrition: String,
    compliance: String
}, { timestamps: true });

const comboSchema = new mongoose.Schema({
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }], // References to Product
    originalPrice: Number,
    comboPrice: Number,
    image: String,
    description: String
}, { timestamps: true });

module.exports = {
    Product: mongoose.model('Product', productSchema),
    Combo: mongoose.model('Combo', comboSchema)
};
