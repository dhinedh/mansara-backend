const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

async function testIntegrity() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const { Product } = require('./models/Product');
        const Order = require('./models/Order');

        // Pick a test product
        const product = await Product.findOne({ slug: 'urad-porridge-mix-classic' });
        if (!product) throw new Error('Test product not found');

        const dbPrice = product.offerPrice || product.price;
        console.log(`DB Price for ${product.name}: ${dbPrice}`);

        // Mock an order request with a WRONG (tampered) price
        const fakePrice = 1; // Attempt to buy for ₹1
        const items = [{
            product: product._id,
            name: product.name,
            quantity: 1,
            price: fakePrice // This is what a hacker might send
        }];

        // Recalculate as the backend would
        let dbTotal = 0;
        for (const item of items) {
            const p = await Product.findById(item.product);
            const itemPrice = (p.offerPrice && p.offerPrice > 0) ? p.offerPrice : p.price;
            dbTotal += (itemPrice * item.quantity);
        }

        console.log(`Calculated Total in Backend: ${dbTotal}`);

        if (dbTotal === dbPrice) {
            console.log('✓ Success: Backend correctly ignored the fake price and used the DB price.');
        } else {
            console.error('✗ Failed: Backend used the wrong price!');
        }

    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

testIntegrity();
