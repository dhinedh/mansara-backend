const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const { Product } = require('./models/Product');

const checkProducts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const products = await Product.find({}, 'name isNewArrival isActive category');

        console.log('--- Product Status ---');
        console.log(`Total Products Found: ${products.length}`);

        products.forEach(p => {
            console.log(`[${p._id}] ${p.name}`);
            console.log(`   isNewArrival: ${p.isNewArrival} (${typeof p.isNewArrival})`);
            console.log(`   isActive: ${p.isActive} (${typeof p.isActive})`);
            console.log(`   category: ${p.category}`);
        });

        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkProducts();
