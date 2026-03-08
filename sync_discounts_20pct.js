const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('Error: MONGODB_URI not found in .env file');
    process.exit(1);
}

// Define Schema (simplified for the update)
const productSchema = new mongoose.Schema({
    price: Number,
    offerPrice: Number,
    isOffer: Boolean,
    variants: [{
        price: Number,
        offerPrice: Number,
        weight: String
    }]
}, { collection: 'products', discriminatorKey: 'type' });

const Product = mongoose.model('Product', productSchema);

async function syncDiscounts() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const products = await Product.find({});
        console.log(`Found ${products.length} items to process (including products and combos)`);

        let updatedCount = 0;

        for (const product of products) {
            // Calculate 20% discount from the current price (which was already increased by 20%)
            const newOfferPrice = Math.round(product.price * 0.8);

            product.isOffer = true;
            product.offerPrice = newOfferPrice;

            // Update variants if they exist
            if (product.variants && product.variants.length > 0) {
                product.variants = product.variants.map(v => ({
                    ...v,
                    offerPrice: Math.round(v.price * 0.8)
                }));
            }

            // For combos (if they have comboPrice/originalPrice fields in DB)
            // Note: In the discriminator model, combos might have different field names but use the same base
            if (product.type === 'combo') {
                // Handle combo specific fields if necessary
            }

            await product.save();
            updatedCount++;
            console.log(`Updated: ${product._id} | New Offer Price: ${newOfferPrice}`);
        }

        console.log(`Success! Updated ${updatedCount} items with 20% discount offers.`);
    } catch (error) {
        console.error('Error during synchronization:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

syncDiscounts();
