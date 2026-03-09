const mongoose = require('mongoose');

// MongoDB Connection URL from .env
const MONGO_URI = 'mongodb+srv://joypackers60_db_user:EYp8MTlbyeyX7X35@cluster0.rhqubga.mongodb.net/mansara-db';

async function checkData() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const Product = mongoose.model('Product', new mongoose.Schema({
            name: String,
            slug: String,
            price: Number,
            offerPrice: Number,
            isOffer: Boolean,
            variants: Array
        }));

        const productsToCheck = [
            'ragi-choco-malt',
            'nutrimix-super-health-mix',
            'urad-porridge-mix-classic',
            'urad-porridge-mix-salt-pepper'
        ];

        for (const slug of productsToCheck) {
            const p = await Product.findOne({ slug });
            if (p) {
                console.log(`\n--- ${p.name} (${p.slug}) ---`);
                console.log(`Main Price: ${p.price}, Offer: ${p.offerPrice}, isOffer: ${p.isOffer}`);
                if (p.variants && p.variants.length > 0) {
                    console.log('Variants:');
                    p.variants.forEach(v => {
                        console.log(`  - ${v.weight}: ${v.price} (Offer: ${v.offerPrice})`);
                    });
                }
            } else {
                console.log(`\nProduct NOT FOUND: ${slug}`);
            }
        }

        mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkData();
