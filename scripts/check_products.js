const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function checkProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const { Product } = require('../models/Product');
        
        const ragi = await Product.findOne({ name: /Ragi Choco Malt/i });
        const nutriminix = await Product.findOne({ name: /Nutriminix/i });
        
        console.log('Ragi Choco Malt:', JSON.stringify(ragi, null, 2));
        console.log('Nutriminix:', JSON.stringify(nutriminix, null, 2));
        
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkProducts();
