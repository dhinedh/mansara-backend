require('dotenv').config();
const mongoose = require('mongoose');

async function updateBaseStocks() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const { Product } = require('./models/Product');

        // Update all products that are NOT combos
        const result = await Product.updateMany(
            { __t: { $ne: 'Combo' } },
            { $set: { stock: 50, isActive: true } }
        );

        console.log(`✅ Updated ${result.modifiedCount} base products to stock count 50`);

        // List products to verify
        const products = await Product.find({ __t: { $ne: 'Combo' } }).select('name stock').lean();
        console.log('--- Current Base Product Stocks ---');
        products.forEach(p => console.log(`${p.name}: ${p.stock}`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

updateBaseStocks();
