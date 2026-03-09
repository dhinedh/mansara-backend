const mongoose = require('mongoose');
require('dotenv').config();
const { Product, Combo } = require('./models/Product');

const DISCOUNT_FACTOR = 0.8; // 20% off

const applyDiscount = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Process Products
        const products = await Product.find({});
        console.log(`Processing ${products.length} products...`);

        for (const product of products) {
            let changed = false;

            // Helper to update prices based on MRP
            const getNewPrices = (price, offerPrice, originalPrice) => {
                // Find the absolute maximum ever assigned
                const mrp = Math.max(price || 0, offerPrice || 0, originalPrice || 0);
                const newOffer = Math.round(mrp * DISCOUNT_FACTOR);
                return {
                    mrp,
                    newOffer
                };
            };

            // Update main product
            const mainPrices = getNewPrices(product.price, product.offerPrice, product.originalPrice);
            if (mainPrices.mrp > 0) {
                product.originalPrice = mainPrices.mrp;
                product.offerPrice = mainPrices.newOffer;
                product.price = mainPrices.newOffer; // Selling price = Offer price
                product.isOffer = true;
                changed = true;
            }

            // Update variants
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(variant => {
                    const vPrices = getNewPrices(variant.price, variant.offerPrice, variant.originalPrice);
                    if (vPrices.mrp > 0) {
                        variant.originalPrice = vPrices.mrp;
                        variant.offerPrice = vPrices.newOffer;
                        variant.price = vPrices.newOffer; // Selling price = Offer price
                    }
                });
                changed = true;
            }

            if (changed) {
                product.markModified('variants'); // Ensure variants are marked as modified
                await product.save();
                console.log(`✓ Updated product: ${product.name}`);
            }
        }

        // 2. Process Combos
        const combos = await Combo.find({});
        console.log(`Processing ${combos.length} combos...`);

        for (const combo of combos) {
            const mrp = Math.max(combo.originalPrice || 0, combo.comboPrice || 0);
            if (mrp > 0) {
                combo.originalPrice = mrp;
                combo.comboPrice = Math.round(mrp * DISCOUNT_FACTOR);
                combo.isActive = true;
                await combo.save();
                console.log(`✓ Updated combo: ${combo.name}`);
            }
        }

        console.log('Bulk update completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error during bulk update:', err);
        process.exit(1);
    }
};

applyDiscount();
