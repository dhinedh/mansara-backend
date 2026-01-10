require('dotenv').config();
const mongoose = require('mongoose');

async function checkProduct() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        const { Product } = require('../models/Product');

        const product = await Product.findOne({ name: "Millet Fusion Idly Podi" }).lean();

        if (product) {
            console.log('Product Found:');
            console.log('ID:', product._id);
            console.log('Name:', product.name);
            console.log('Ingredients:', product.ingredients, '(Type:', typeof product.ingredients, ')');
            console.log('HowToUse:', product.howToUse);
            console.log('Storage:', product.storage);
            console.log('Highlights:', product.highlights);
        } else {
            console.log('❌ Product not found');
        }

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

checkProduct();
