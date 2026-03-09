const mongoose = require('mongoose');

// MongoDB Connection URL from .env
const MONGO_URI = 'mongodb+srv://joypackers60_db_user:EYp8MTlbyeyX7X35@cluster0.rhqubga.mongodb.net/mansara-db';

async function checkAllData() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const Product = mongoose.model('Product', new mongoose.Schema({
            name: String,
            slug: String,
            price: Number,
            offerPrice: Number,
            isOffer: Boolean,
            isActive: Boolean,
            variants: Array
        }));

        const products = await Product.find({});
        console.log(`Found ${products.length} products:`);

        products.forEach(p => {
            console.log(`- ${p.name} | Slug: ${p.slug} | isOffer: ${p.isOffer} | isActive: ${p.isActive}`);
            if (p.isOffer) {
                console.log(`  OFFER! Main: ${p.price} -> ${p.offerPrice}`);
                if (p.variants && p.variants.length > 0) {
                    p.variants.forEach(v => {
                        if (v.offerPrice < v.price) {
                            console.log(`  VARIANT OFFER: ${v.weight} | ${v.price} -> ${v.offerPrice}`);
                        }
                    });
                }
            }
        });

        mongoose.connection.close();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkAllData();
