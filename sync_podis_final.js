const mongoose = require('mongoose');
require('dotenv').config();

const updates = [
    {
        slug: "traditional-idly-podi",
        name: "Idly Podi – Traditional",
        price: 75,
        offerPrice: 75,
        variants: [{ weight: "100g", price: 75, stock: 100 }]
    },
    {
        slug: "millet-fusion-idly-podi",
        name: "Idly Podi – Millet Fusion",
        price: 75,
        offerPrice: 75,
        variants: [{ weight: "100g", price: 75, stock: 100 }]
    },
    {
        slug: "home-style-paruppu-podi",
        name: "Rice Podi Mix",
        price: 85,
        offerPrice: 85,
        variants: [{ weight: "100g", price: 85, stock: 100 }]
    },
    {
        slug: "karuveppillai-special",
        name: "Curry Leaves Rice Podi Mix",
        price: 85,
        offerPrice: 85,
        variants: [{ weight: "100g", price: 85, stock: 100 }]
    },
    {
        slug: "kotha-malli-aroma",
        name: "Coriander Rice Podi Mix",
        price: 85,
        offerPrice: 85,
        variants: [{ weight: "100g", price: 85, stock: 100 }]
    },
    {
        slug: "murungai-vital",
        name: "Moringa Rice Podi Mix",
        price: 85,
        offerPrice: 85,
        variants: [{ weight: "100g", price: 85, stock: 100 }]
    },
    {
        slug: "pirandai-power",
        name: "Pirandai Rice Podi Mix",
        price: 85,
        offerPrice: 85,
        variants: [{ weight: "100g", price: 85, stock: 100 }]
    }
];

async function syncUpdates() {
    const dbNames = ['test', 'mansara-db'];
    const baseUri = 'mongodb+srv://joypackers60_db_user:EYp8MTlbyeyX7X35@cluster0.rhqubga.mongodb.net/';

    for (const dbName of dbNames) {
        try {
            console.log(`\n>>> Syncing Podi Updates for Database: ${dbName}`);
            const uri = `${baseUri}${dbName}?retryWrites=true&w=majority`;
            await mongoose.connect(uri);

            const productsCol = mongoose.connection.db.collection('products');

            for (const item of updates) {
                console.log(`  Updating: ${item.slug} -> Name: ${item.name} (₹${item.price})`);
                await productsCol.updateOne(
                    { slug: item.slug },
                    {
                        $set: {
                            name: item.name,
                            price: item.price,
                            offerPrice: item.offerPrice,
                            variants: item.variants,
                            updatedAt: new Date()
                        }
                    }
                );
            }

            console.log(`  Podi update sync complete for ${dbName}`);
            await mongoose.disconnect();
        } catch (error) {
            console.error(`  Error syncing ${dbName}:`, error.message);
        }
    }
}

syncUpdates();
