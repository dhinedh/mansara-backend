const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Product } = require('./models/Product');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
};

const verify = async () => {
    await connectDB();

    // Check one product
    const product = await Product.findOne({ name: /Urad Porridge Mix – Classic/i });
    if (product) {
        console.log('Product Found:', product.name);
        console.log('Price:', product.price);
        console.log('Weight:', product.weight);
        console.log('Variants:', JSON.stringify(product.variants, null, 2));
    } else {
        console.log('Product not found');
    }

    process.exit(0);
};

verify();
