require('dotenv').config();
const mongoose = require('mongoose');

async function removeProductOffers() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const { Product } = require('./models/Product');

        console.log('[Offers] Removing offers from all products...');

        // Update all products
        const products = await Product.find({ isActive: true });

        for (const p of products) {
            // Update main product prices
            p.isOffer = false;
            p.offerPrice = p.price;
            p.originalPrice = p.price;

            // Update variant prices
            if (p.variants && p.variants.length > 0) {
                p.variants = p.variants.map(v => ({
                    ...v.toObject ? v.toObject() : v,
                    offerPrice: v.price
                }));
            }

            await p.save();
            console.log(`✅ Removed offer from ${p.slug}`);
        }

        console.log('🎉 All offers removed successfully!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

removeProductOffers();
