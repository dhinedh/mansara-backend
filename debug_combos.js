require('dotenv').config();
const mongoose = require('mongoose');

async function debugCombos() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const { Product, Combo } = require('./models/Product');

        console.log('--- ALL PRODUCTS IN DB ---');
        const allProducts = await Product.find({}).lean();
        console.log(`Total items in products collection: ${allProducts.length}`);

        const combos = await Product.find({ __t: 'Combo' }).lean();
        console.log('--- COMBOS (__t: "Combo") ---');
        console.log(JSON.stringify(combos, null, 2));

        const productsWithItems = await Product.find({ products: { $exists: true, $not: { $size: 0 } } }).lean();
        console.log('--- PRODUCTS WITH "products" ARRAY ---');
        console.log(JSON.stringify(productsWithItems, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugCombos();
