const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection URL from .env
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://joypackers60_db_user:EYp8MTlbyeyX7X35@cluster0.rhqubga.mongodb.net/mansara-db';

const targetPrices = [
    { name: "Ragi Choco Malt", weight: "250g", price: 250, slug: "ragi-choco-malt" },
    { name: "Nutriminix – Multi Grain Health Mix", weight: "250g", price: 200, slug: "nutrimix-super-health-mix" },
    { name: "Urad Health Mix – Classic", weight: "100g", price: 55, slug: "urad-porridge-mix-classic" },
    { name: "Urad Health Mix – Classic", weight: "250g", price: 140, slug: "urad-porridge-mix-classic" },
    { name: "Urad Health Mix – Salt n Pepper", weight: "100g", price: 55, slug: "urad-porridge-mix-salt-pepper" },
    { name: "Urad Health Mix – Salt n Pepper", weight: "250g", price: 140, slug: "urad-porridge-mix-salt-pepper" },
    { name: "Urad Health Mix – Millet Magic", weight: "100g", price: 60, slug: "urad-porridge-mix-millet-magic" },
    { name: "Urad Health Mix – Millet Magic", weight: "250g", price: 150, slug: "urad-porridge-mix-millet-magic" },
    { name: "Urad Health Mix – Premium", weight: "100g", price: 65, slug: "urad-porridge-mix-premium" },
    { name: "Urad Health Mix – Premium", weight: "250g", price: 160, slug: "urad-porridge-mix-premium" },
    { name: "Health Mix – Black Rice Delight", weight: "100g", price: 70, slug: "black-rice-delight-porridge-mix" },
    { name: "Health Mix – Black Rice Delight", weight: "250g", price: 180, slug: "black-rice-delight-porridge-mix" },
    { name: "Idly Podi – Traditional", weight: "100g", price: 75, slug: "traditional-idly-podi" },
    { name: "Idly Podi – Millet Fusion", weight: "100g", price: 75, slug: "millet-fusion-idly-podi" },
    { name: "Rice Podi Mix", weight: "100g", price: 85, slug: "home-style-paruppu-podi" },
    { name: "Pirandai Rice Podi Mix", weight: "100g", price: 85, slug: "pirandai-power" },
    { name: "Moringa Rice Podi Mix", weight: "100g", price: 85, slug: "murungai-vital" },
    { name: "Curry Leaves Rice Podi Mix", weight: "100g", price: 85, slug: "karuveppillai-special" },
    { name: "Coriander Rice Podi Mix", weight: "100g", price: 85, slug: "kotha-malli-aroma" }
];

async function syncPrices() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const ProductSchema = new mongoose.Schema({
            name: String,
            slug: String,
            price: Number,
            originalPrice: Number,
            offerPrice: Number,
            isOffer: Boolean,
            variants: Array
        });

        // Use existing model if already compiled, else create it
        const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

        for (const target of targetPrices) {
            const product = await Product.findOne({ slug: target.slug });
            if (!product) {
                console.warn(`⚠️ Product not found: ${target.slug}`);
                continue;
            }

            console.log(`Processing ${product.name} (${target.slug})...`);

            let updated = false;

            // Update base price if the weight matches the user's primary weight for this entry
            if (product.weight === target.weight) {
                console.log(`  Updating base price for ${target.weight}: ${product.price} -> ${target.price}`);
                product.price = target.price;
                product.originalPrice = target.price;

                // If it was an offer, recalculate offerPrice (20% OFF)
                if (product.isOffer) {
                    product.offerPrice = Math.round(target.price * 0.8);
                } else {
                    product.offerPrice = target.price;
                }
                updated = true;
            }

            // Update variants
            if (product.variants && product.variants.length > 0) {
                product.variants = product.variants.map(v => {
                    const vObj = v.toObject ? v.toObject() : v;
                    if (v.weight === target.weight) {
                        console.log(`  Updating variant price for ${target.weight}: ${v.price} -> ${target.price}`);
                        const newPrice = target.price;
                        const newOfferPrice = product.isOffer ? Math.round(newPrice * 0.8) : newPrice;
                        updated = true;
                        return {
                            ...vObj,
                            price: newPrice,
                            originalPrice: newPrice,
                            offerPrice: newOfferPrice
                        };
                    }
                    return vObj;
                });
            }

            if (updated) {
                // Ensure markModified is called for variants array since it's an array of objects
                product.markModified('variants');
                await product.save();
                console.log(`  ✓ Saved ${product.name}`);
            }
        }

        console.log('\n✅ All prices synchronized with the provided list.');
        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error synchronizing prices:', err);
        process.exit(1);
    }
}

syncPrices();
