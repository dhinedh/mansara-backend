require('dotenv').config();
const mongoose = require('mongoose');

async function checkProducts() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const { Product } = require('./models/Product');

        const products = await Product.find({ __t: { $ne: 'Combo' } }).lean();
        console.log(JSON.stringify(products.map(p => ({
            name: p.name,
            slug: p.slug,
            price: p.price,
            offerPrice: p.offerPrice,
            weight: p.weight,
            variants: p.variants
        })), null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkProducts();
