require('dotenv').config();
const mongoose = require('mongoose');

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const { Product } = require('./models/Product');
    const products = await Product.find({}).lean();
    console.log('Slugs in DB:');
    products.forEach(p => console.log(`'${p.slug}' - ${p.name}`));
    await mongoose.disconnect();
}

check();
