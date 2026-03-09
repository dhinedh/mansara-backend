const mongoose = require('mongoose');
require('dotenv').config();

// MongoDB Connection URL from .env
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://joypackers60_db_user:EYp8MTlbyeyX7X35@cluster0.rhqubga.mongodb.net/mansara-db';

const targetOfferPrices = [
    { name: "Ragi Choco Malt", weight: "250g", offerPrice: 200, slug: "ragi-choco-malt" },
    { name: "Nutriminix – Multi Grain Health Mix", weight: "250g", offerPrice: 160, slug: "nutrimix-super-health-mix" },
    { name: "Urad Health Mix – Classic", weight: "100g", offerPrice: 44, slug: "urad-porridge-mix-classic" },
    { name: "Urad Health Mix – Classic", weight: "250g", offerPrice: 112, slug: "urad-porridge-mix-classic" },
    { name: "Urad Health Mix – Salt n Pepper", weight: "100g", offerPrice: 44, slug: "urad-porridge-mix-salt-pepper" },
    { name: "Urad Health Mix – Salt n Pepper", weight: "250g", offerPrice: 112, slug: "urad-porridge-mix-salt-pepper" },
    { name: "Urad Health Mix – Millet Magic", weight: "100g", offerPrice: 48, slug: "urad-porridge-mix-millet-magic" },
    { name: "Urad Health Mix – Millet Magic", weight: "250g", offerPrice: 120, slug: "urad-porridge-mix-millet-magic" },
    { name: "Urad Health Mix – Premium", weight: "100g", offerPrice: 52, slug: "urad-porridge-mix-premium" },
    { name: "Urad Health Mix – Premium", weight: "250g", offerPrice: 128, slug: "urad-porridge-mix-premium" },
    { name: "Health Mix – Black Rice Delight", weight: "100g", offerPrice: 56, slug: "black-rice-delight-porridge-mix" },
    { name: "Health Mix – Black Rice Delight", weight: "250g", offerPrice: 144, slug: "black-rice-delight-porridge-mix" },
    { name: "Idly Podi – Traditional", weight: "100g", offerPrice: 60, slug: "traditional-idly-podi" },
    { name: "Idly Podi – Millet Fusion", weight: "100g", offerPrice: 60, slug: "millet-fusion-idly-podi" },
    { name: "Rice Podi Mix", weight: "100g", offerPrice: 68, slug: "home-style-paruppu-podi" },
    { name: "Pirandai Rice Podi Mix", weight: "100g", offerPrice: 68, slug: "pirandai-power" },
    { name: "Moringa Rice Podi Mix", weight: "100g", offerPrice: 68, slug: "murungai-vital" },
    { name: "Curry Leaves Rice Podi Mix", weight: "100g", offerPrice: 68, slug: "karuveppillai-special" },
    { name: "Coriander Rice Podi Mix", weight: "100g", offerPrice: 68, slug: "kotha-malli-aroma" }
];

async function syncOfferPrices() {
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

        const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

        for (const target of targetOfferPrices) {
            const product = await Product.findOne({ slug: target.slug });
            if (!product) {
                console.warn(`⚠️ Product not found: ${target.slug}`);
                continue;
            }

            console.log(`Processing Offer for ${product.name} (${target.slug})...`);

            let updated = false;

            // Mark product as on offer
            product.isOffer = true;

            // Update base offer price if the weight matches
            if (product.weight === target.weight) {
                console.log(`  Updating base offer price for ${target.weight}: ${product.offerPrice} -> ${target.offerPrice}`);
                product.offerPrice = target.offerPrice;
                updated = true;
            }

            // Update variants
            if (product.variants && product.variants.length > 0) {
                product.variants = product.variants.map(v => {
                    const vObj = v.toObject ? v.toObject() : v;
                    if (v.weight === target.weight) {
                        console.log(`  Updating variant offer price for ${target.weight}: ${v.offerPrice} -> ${target.offerPrice}`);
                        updated = true;
                        return {
                            ...vObj,
                            offerPrice: target.offerPrice
                        };
                    }
                    return vObj;
                });
            }

            if (updated) {
                product.markModified('variants');
                await product.save();
                console.log(`  ✓ Saved ${product.name}`);
            }
        }

        console.log('\n✅ All offer prices synchronized with the provided list.');
        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error synchronizing offer prices:', err);
        process.exit(1);
    }
}

syncOfferPrices();
