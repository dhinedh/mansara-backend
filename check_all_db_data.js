const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function check() {
    try {
        await mongoose.connect(MONGODB_URI);
        const products = await mongoose.connection.db.collection('products').find({}).toArray();
        console.log('--- PRODUCTS ---');
        products.forEach(p => {
            console.log(`Slug: ${p.slug}, Price: ${p.price}, OfferPrice: ${p.offerPrice}, isOffer: ${p.isOffer}`);
            if (p.variants) {
                console.log(`  Variants: ${JSON.stringify(p.variants)}`);
            }
        });

        const combos = await mongoose.connection.db.collection('combos').find({}).toArray();
        console.log('--- COMBOS ---');
        combos.forEach(c => {
            console.log(`Slug: ${c.slug}, OriginalPrice: ${c.originalPrice}, ComboPrice: ${c.comboPrice}`);
        });

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

check();
