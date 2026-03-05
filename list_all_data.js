require('dotenv').config();
const mongoose = require('mongoose');

async function listAllData() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const { Product } = require('./models/Product');
        const Category = require('./models/Category');

        const categories = await Category.find({}).lean();
        const products = await Product.find({}).lean();

        console.log('--- CATEGORIES ---');
        console.log(JSON.stringify(categories, null, 2));
        console.log('--- PRODUCTS ---');
        console.log(JSON.stringify(products, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

listAllData();
