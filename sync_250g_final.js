const mongoose = require('mongoose');
require('dotenv').config();

const updates = [
    {
        slug: "urad-porridge-mix-classic",
        name: "Urad Health Mix – Classic",
        variants: [
            { weight: "100g", price: 55, offerPrice: 55, stock: 50 },
            { weight: "200g", price: 105, offerPrice: 105, stock: 50 },
            { weight: "250g", price: 140, offerPrice: 140, stock: 50 }
        ]
    },
    {
        slug: "urad-porridge-mix-salt-pepper",
        name: "Urad Health Mix – Salt n Pepper",
        variants: [
            { weight: "100g", price: 55, offerPrice: 55, stock: 50 },
            { weight: "200g", price: 105, offerPrice: 105, stock: 50 },
            { weight: "250g", price: 140, offerPrice: 140, stock: 50 }
        ]
    },
    {
        slug: "urad-porridge-mix-millet-magic",
        name: "Urad Health Mix – Millet Magic",
        variants: [
            { weight: "100g", price: 60, offerPrice: 60, stock: 50 },
            { weight: "200g", price: 115, offerPrice: 115, stock: 50 },
            { weight: "250g", price: 150, offerPrice: 150, stock: 50 }
        ]
    },
    {
        slug: "urad-porridge-mix-premium",
        name: "Urad Health Mix – Premium",
        variants: [
            { weight: "100g", price: 65, offerPrice: 65, stock: 50 },
            { weight: "200g", price: 125, offerPrice: 125, stock: 50 },
            { weight: "250g", price: 160, offerPrice: 160, stock: 50 }
        ]
    },
    {
        slug: "black-rice-delight-porridge-mix",
        name: "Health Mix – Black Rice Delight",
        variants: [
            { weight: "100g", price: 70, offerPrice: 70, stock: 50 },
            { weight: "200g", price: 135, offerPrice: 135, stock: 50 },
            { weight: "250g", price: 180, offerPrice: 180, stock: 50 }
        ]
    },
    {
        slug: "ragi-choco-malt",
        name: "Ragi Choco Malt",
        variants: [
            { weight: "100g", price: 70, offerPrice: 70, stock: 100 },
            { weight: "250g", price: 250, offerPrice: 250, stock: 100 }
        ]
    },
    {
        slug: "nutrimix-super-health-mix",
        name: "Nutriminix – Multi Grain Health Mix",
        variants: [
            { weight: "250g", price: 200, offerPrice: 200, stock: 100 }
        ]
    }
];

async function syncUpdates() {
    const dbNames = ['test', 'mansara-db'];
    const baseUri = 'mongodb+srv://joypackers60_db_user:EYp8MTlbyeyX7X35@cluster0.rhqubga.mongodb.net/';

    for (const dbName of dbNames) {
        try {
            console.log(`\n>>> Syncing Updates for Database: ${dbName}`);
            const uri = `${baseUri}${dbName}?retryWrites=true&w=majority`;
            await mongoose.connect(uri);

            const productsCol = mongoose.connection.db.collection('products');

            for (const item of updates) {
                console.log(`  Updating: ${item.slug} -> Name: ${item.name}`);
                await productsCol.updateOne(
                    { slug: item.slug },
                    {
                        $set: {
                            name: item.name,
                            variants: item.variants,
                            updatedAt: new Date()
                        }
                    }
                );
            }

            console.log(`  Update sync complete for ${dbName}`);
            await mongoose.disconnect();
        } catch (error) {
            console.error(`  Error syncing ${dbName}:`, error.message);
        }
    }
}

syncUpdates();
