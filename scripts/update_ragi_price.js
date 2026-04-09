const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function updatePrice() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const { Product } = require('../models/Product');
        
        const result = await Product.updateMany(
            { name: /Ragi Choco Malt/i },
            { $set: { price: 250, originalPrice: 250 } }
        );
        
        console.log(`Updated ${result.modifiedCount} product(s).`);
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updatePrice();
