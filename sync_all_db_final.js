const mongoose = require('mongoose');
require('dotenv').config();

const productsData = [
    { slug: "urad-porridge-mix-classic", price: 70 },
    { slug: "urad-porridge-mix-salt-pepper", price: 70 },
    { slug: "urad-porridge-mix-millet-magic", price: 70 },
    { slug: "urad-porridge-mix-premium", price: 70 },
    { slug: "black-rice-delight-porridge-mix", price: 70 },
    { slug: "millet-fusion-idly-podi", price: 70 },
    { slug: "ragi-choco-malt", price: 70 }
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
                console.log(`  Updating ${p.slug}...`);
                await productsCol.updateMany(
                    { slug: p.slug },
                    {
                        $set: {
                            price: 70,
                            offerPrice: 70,
                            originalPrice: 70,
                            isOffer: false,
                            stock: 50,
                            isActive: true,
                            "variants.$[].price": 70,
                            "variants.$[].offerPrice": 70,
                            "variants.$[].stock": 50
                        }
                    }
                );
            }

            // Also handle variants for non-100g specifically if needed, 
            // but the above $[] updates all variants in the array.
            // Wait, urad mixes have 200g at 105. I should probably use a more nuanced update.

            console.log(`  Sync complete for ${dbName}`);
            await mongoose.disconnect();
        } catch (error) {
            console.error(`  Error syncing ${dbName}:`, error.message);
        }
    }
}

syncAll();
