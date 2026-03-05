const mongoose = require('mongoose');
require('dotenv').config();

const productsData = [
    { slug: "urad-porridge-mix-classic", price: 70, weight: "100g" },
    { slug: "urad-porridge-mix-salt-pepper", price: 70, weight: "100g" },
    { slug: "urad-porridge-mix-millet-magic", price: 70, weight: "100g" },
    { slug: "urad-porridge-mix-premium", price: 70, weight: "100g" },
    { slug: "black-rice-delight-porridge-mix", price: 70, weight: "100g" },
    { slug: "millet-fusion-idly-podi", price: 70, weight: "100g" },
    { slug: "ragi-choco-malt", price: 70, weight: "100g" }
];

async function syncAll() {
    const dbNames = ['test', 'mansara-db'];
    const baseUri = 'mongodb+srv://joypackers60_db_user:EYp8MTlbyeyX7X35@cluster0.rhqubga.mongodb.net/';

    for (const dbName of dbNames) {
        try {
            console.log(`\n>>> Syncing Database: ${dbName}`);
            const uri = `${baseUri}${dbName}?retryWrites=true&w=majority`;
            await mongoose.connect(uri);

            const collections = await mongoose.connection.db.listCollections().toArray();
            if (!collections.some(c => c.name === 'products')) {
                console.log(`  No products collection in ${dbName}, skipping.`);
                await mongoose.disconnect();
                continue;
            }

            const productsCol = mongoose.connection.db.collection('products');

            for (const p of productsData) {
                console.log(`  Updating ${p.slug} in ${dbName}...`);

                // Fetch the product to see its current variants
                const product = await productsCol.findOne({ slug: p.slug });
                if (!product) {
                    console.log(`    Product ${p.slug} not found in ${dbName}`);
                    continue;
                }

                // Prepare updated variants
                const updatedVariants = (product.variants || []).map(v => {
                    if (v.weight === "100g") {
                        return { ...v, price: 70, offerPrice: 70, stock: 50 };
                    }
                    // For other weights, just ensure offerPrice = price and stock 50
                    return { ...v, offerPrice: v.price, stock: 50 };
                });

                // Perform update
                await productsCol.updateOne(
                    { _id: product._id },
                    {
                        $set: {
                            price: 70,
                            offerPrice: 70,
                            originalPrice: 70,
                            isOffer: false,
                            stock: 50,
                            isActive: true,
                            variants: updatedVariants,
                            weight: "100g" // Ensure base weight is 100g
                        }
                    }
                );
            }

            // Also update the Ultimate Wellness Combo (5 Mixes)
            console.log(`  Updating ultimate-wellness-combo-5-mixes...`);
            await productsCol.updateOne(
                { slug: "ultimate-wellness-combo-5-mixes" },
                {
                    $set: {
                        price: 260,
                        offerPrice: 260,
                        originalPrice: 260,
                        isOffer: false,
                        stock: 50,
                        isActive: true
                    }
                }
            );

            console.log(`  Sync complete for ${dbName}`);
            await mongoose.disconnect();
        } catch (error) {
            console.error(`  Error syncing ${dbName}:`, error.message);
        }
    }
}

syncAll();
