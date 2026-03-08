const mongoose = require('mongoose');
require('dotenv').config();
const { Product } = require('./models/Product');

const priceUpdates = [
    { slug: 'ragi-choco-malt', weight: '250g', price: 250, offerPrice: 200 },
    { slug: 'nutrimix-super-health-mix', weight: '250g', price: 200, offerPrice: 160 },
    { slug: 'urad-porridge-mix-classic', weight: '250g', price: 140, offerPrice: 112 },
    { slug: 'urad-porridge-mix-salt-pepper', weight: '250g', price: 140, offerPrice: 112 },
    { slug: 'urad-porridge-mix-millet-magic', weight: '250g', price: 150, offerPrice: 120 },
    { slug: 'urad-porridge-mix-premium', weight: '250g', price: 160, offerPrice: 128 },
    { slug: 'black-rice-delight-porridge-mix', weight: '250g', price: 180, offerPrice: 144 },
    { slug: 'traditional-idly-podi', weight: '100g', price: 75, offerPrice: 60 },
    { slug: 'millet-fusion-idly-podi', weight: '100g', price: 75, offerPrice: 60 },
    { slug: 'home-style-paruppu-podi', weight: '100g', price: 85, offerPrice: 68 },
    { slug: 'pirandai-power', weight: '100g', price: 85, offerPrice: 68 },
    { slug: 'murungai-vital', weight: '100g', price: 85, offerPrice: 68 },
    { slug: 'karuveppillai-special', weight: '100g', price: 85, offerPrice: 68 },
    { slug: 'kotha-malli-aroma', weight: '100g', price: 85, offerPrice: 68 },
];

const updateSpecificPrices = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const update of priceUpdates) {
            const product = await Product.findOne({ slug: update.slug });

            if (!product) {
                console.warn(`⚠️ Product not found: ${update.slug}`);
                continue;
            }

            console.log(`Updating ${product.name} (${update.slug})...`);

            // Flag to track if the specific weight was found
            let matchFound = false;

            // Update base fields if weight matches
            if (product.weight === update.weight) {
                product.price = update.price;
                product.offerPrice = update.offerPrice;
                product.isOffer = true;
                product.originalPrice = update.price;
                matchFound = true;
            } else {
                // If base weight doesn't match the offer, clear the base offer price
                product.offerPrice = product.price;
            }

            // Update variants
            if (product.variants && product.variants.length > 0) {
                product.variants = product.variants.map(v => {
                    const vObj = v.toObject ? v.toObject() : v;
                    if (v.weight === update.weight) {
                        matchFound = true;
                        return {
                            ...vObj,
                            price: update.price,
                            offerPrice: update.offerPrice
                        };
                    } else {
                        // Clear offer for non-matching variants of this product
                        return {
                            ...vObj,
                            offerPrice: vObj.price
                        };
                    }
                });
            }

            // Set global offer flag
            product.isOffer = true;

            await product.save();
            if (matchFound) {
                console.log(`  ✓ Successfully updated ${update.weight} for ${product.name}`);
            } else {
                console.warn(`  ⚠️ Requested weight ${update.weight} not found for ${product.name}`);
            }
        }

        console.log('✅ All specific price updates complete.');
    } catch (error) {
        console.error('❌ Error during database update:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

updateSpecificPrices();
