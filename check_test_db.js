const mongoose = require('mongoose');
require('dotenv').config();

async function checkTestDb() {
    try {
        const uri = 'mongodb+srv://joypackers60_db_user:EYp8MTlbyeyX7X35@cluster0.rhqubga.mongodb.net/test';
        console.log(`Connecting to: ${uri}`);
        await mongoose.connect(uri);

        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in test-db:');
        collections.forEach(c => console.log(`- ${c.name}`));

        if (collections.some(c => c.name === 'products')) {
            const products = await mongoose.connection.db.collection('products').find({}).toArray();
            console.log(`Found ${products.length} products in test.products`);
            products.forEach(p => {
                if (p.slug === 'urad-porridge-mix-classic') {
                    console.log(`- ${p.name}: Price=${p.price}, OfferPrice=${p.offerPrice}`);
                }
            });
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkTestDb();
