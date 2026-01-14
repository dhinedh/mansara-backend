const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const { Product } = require('./models/Product');

const updateVariants = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const products = await Product.find({});
        console.log(`Found ${products.length} products. Processing...`);

        let updatedCount = 0;

        for (const product of products) {
            let isModified = false;

            // Check variants
            if (product.variants && product.variants.length > 0) {
                product.variants.forEach(variant => {
                    const weight = (variant.weight || '').toLowerCase().replace(/\s/g, '');

                    // 100g Update: 10% Discount
                    if (weight === '100g') {
                        // Use Math.floor to ensure at least 10% discount (avoiding 9.x% rounding up)
                        if (variant.price) {
                            const newOfferPrice = Math.floor(variant.price * 0.9);
                            if (variant.offerPrice !== newOfferPrice) {
                                variant.offerPrice = newOfferPrice;
                                isModified = true;
                                console.log(`[${product.name}] Updated 100g variant: Price ${variant.price} -> Offer ${newOfferPrice} (Fixed 10%)`);
                            }
                        }
                    }

                    // 200g Update: Stock 0
                    if (weight === '200g') {
                        if (variant.stock !== 0) {
                            variant.stock = 0;
                            isModified = true;
                            console.log(`[${product.name}] Updated 200g variant: Stock 0`);
                        }
                    }
                });
            }

            // Also check top-level if relevant (though user specifically asked for weights which usually implies variants, 
            // some products might be single-variant at top level)
            const topWeight = (product.weight || '').toLowerCase().replace(/\s/g, '');

            if (topWeight === '100g') {
                if (product.price) {
                    const newOfferPrice = Math.floor(product.price * 0.9);
                    if (product.offerPrice !== newOfferPrice) {
                        product.offerPrice = newOfferPrice;
                        product.isOffer = true;
                        product.offerText = '10% OFF';
                        isModified = true;
                        console.log(`[${product.name}] Updated Top-level 100g: Price ${product.price} -> Offer ${newOfferPrice} (Fixed 10%)`);
                    }
                }
            }

            if (topWeight === '200g') {
                if (product.stock !== 0) {
                    product.stock = 0;
                    isModified = true;
                    console.log(`[${product.name}] Updated Top-level 200g: Stock 0`);
                }
            }

            if (isModified) {
                await product.save();
                updatedCount++;
            }
        }

        console.log(`\nSuccess! Updated ${updatedCount} products.`);
        process.exit(0);

    } catch (error) {
        console.error('Error updating variants:', error);
        process.exit(1);
    }
};

updateVariants();
