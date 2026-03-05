require('dotenv').config();
const mongoose = require('mongoose');

async function debug() {
    await mongoose.connect(process.env.MONGODB_URI);
    const { Product } = require('./models/Product');
    const products = await Product.find({}).lean();
    console.log('Current DB State:');
    products.forEach(p => {
        console.log(`- ${p.name} (${p.slug}):`);
        console.log(`  Price: ${p.price}, OfferPrice: ${p.offerPrice}, OriginalPrice: ${p.originalPrice}`);
        console.log(`  isOffer: ${p.isOffer}, Stock: ${p.stock}`);
        console.log(`  Variants: ${JSON.stringify(p.variants)}`);
    });
    await mongoose.disconnect();
}

debug();
