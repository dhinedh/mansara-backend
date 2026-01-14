const mongoose = require('mongoose');
const { Product } = require('./models/Product');
require('dotenv').config();

const checkNewArrivals = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mansara');
        console.log('Connected to MongoDB');

        const firstProduct = await Product.findOne({ isActive: true });
        if (firstProduct) {
            console.log(`Marking ${firstProduct.name} as New Arrival...`);
            firstProduct.isNewArrival = true;
            await firstProduct.save();
            console.log('Done.');
        } else {
            console.log('No active products found to mark.');
        }

        const newArrivals = await Product.find({ isNewArrival: true }).select('name slug isNewArrival isActive');
        console.log('--- Products with isNewArrival: true ---');
        newArrivals.forEach(p => {
            console.log(`${p.name} (${p.slug}): Active=${p.isActive}`);
        });

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
    }
};

checkNewArrivals();
