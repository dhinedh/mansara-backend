const mongoose = require('mongoose');
require('dotenv').config();

const priceUpdates = [
    {
        slug: "urad-porridge-mix-classic",
        price: 55,
        offerPrice: 55,
        originalPrice: 55,
        variants: [
            { weight: "100g", price: 55, offerPrice: 55, stock: 50 },
            { weight: "200g", price: 105, offerPrice: 105, stock: 50 }
        ]
    },
    {
        slug: "urad-porridge-mix-salt-pepper",
        price: 55,
        offerPrice: 55,
        originalPrice: 55,
        variants: [
            { weight: "100g", price: 55, offerPrice: 55, stock: 50 },
            { weight: "200g", price: 105, offerPrice: 105, stock: 50 }
        ]
    },
    {
        slug: "urad-porridge-mix-millet-magic",
        price: 60,
        offerPrice: 60,
        originalPrice: 60,
        variants: [
            { weight: "100g", price: 60, offerPrice: 60, stock: 50 },
            { weight: "200g", price: 115, offerPrice: 115, stock: 50 }
        ]
    },
    {
        slug: "urad-porridge-mix-premium",
        price: 65,
        offerPrice: 65,
        originalPrice: 65,
        variants: [
            { weight: "100g", price: 65, offerPrice: 65, stock: 50 },
            { weight: "200g", price: 125, offerPrice: 125, stock: 50 }
        ]
    },
    {
        slug: "black-rice-delight-porridge-mix",
        price: 70,
        offerPrice: 70,
        originalPrice: 70,
        variants: [
            { weight: "100g", price: 70, offerPrice: 70, stock: 50 },
            { weight: "200g", price: 135, offerPrice: 135, stock: 50 }
        ]
    },
    {
        slug: "millet-fusion-idly-podi",
        price: 75,
        offerPrice: 75,
        originalPrice: 75,
        variants: [
            { weight: "100g", price: 75, offerPrice: 75, stock: 100 }
        ]
    }
];

async function syncPrices() {
    const dbNames = ['test', 'mansara-db'];
    const baseUri = 'mongodb+srv://joypackers60_db_user:EYp8MTlbyeyX7X35@cluster0.rhqubga.mongodb.net/';

    for (const dbName of dbNames) {
        try {
            console.log(`\n>>> Syncing Prices for Database: ${dbName}`);
            const uri = `${baseUri}${dbName}?retryWrites=true&w=majority`;
            await mongoose.connect(uri);

            const productsCol = mongoose.connection.db.collection('products');

            for (const p of priceUpdates) {
                console.log(`  Updating prices for: ${p.slug} -> ₹${p.price}`);
                await productsCol.updateOne(
                    { slug: p.slug },
                    {
                        $set: {
                            price: p.price,
                            offerPrice: p.offerPrice,
                            originalPrice: p.originalPrice,
                            variants: p.variants,
                            isOffer: false,
                            updatedAt: new Date()
                        }
                    }
                );
            }

            console.log(`  Price sync complete for ${dbName}`);
            await mongoose.disconnect();
        } catch (error) {
            console.error(`  Error syncing ${dbName}:`, error.message);
        }
    }
}

syncPrices();
