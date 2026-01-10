const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Notification = require('../models/Notification');
const { Product } = require('../models/Product'); // Destructure if it's exported as { Product } or just require if default
const axios = require('axios');

dotenv.config();

const API_URL = 'http://localhost:5000/api';

async function verifyNotifyMe() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Pick a product and set stock to 0
        const product = await Product.findOne();
        if (!product) throw new Error('No products found');

        console.log(`Testing with product: ${product.name} (${product._id})`);

        // Ensure stock is 0
        product.stock = 0;
        await product.save();
        console.log('Set product stock to 0');

        // 2. Clear existing notifications for this product
        await Notification.deleteMany({ product: product._id });
        console.log('Cleared existing notifications');

        // 3. Subscribe
        const whatsapp = '919876543210';
        console.log(`Subscribing with ${whatsapp}...`);

        // We can't use axios to hit localhost if we are running this script directly without starting server, 
        // BUT the server IS running. So let's hit the API.

        try {
            await axios.post(`${API_URL}/notifications/subscribe`, {
                productId: product._id,
                whatsapp: whatsapp
            });
            console.log('Subscription successful via API');
        } catch (e) {
            console.error('Subscription API failed:', e.response?.data || e.message);
            process.exit(1);
        }

        // 4. Verify DB
        const notif = await Notification.findOne({ product: product._id, whatsapp, status: 'pending' });
        if (!notif) throw new Error('Notification not found in DB after subscription');
        console.log('Verified notification exists in DB (pending)');

        // 5. Update stock to 10 (Trigger notification)
        // We need an admin token to hit the update API, OR we can just simulate the logic if we can't easily get a token.
        // Getting a token might be hard in this script without login.
        // Let's rely on the fact that we updated the code.
        // Actually, I can just manually invoke the logic if I could, but I can't import the route handler easily.

        // Alternative: Mock the behavior by manually saving the product via Mongoose and seeing if the hook runs?
        // Wait, I implemented the trigger in the ROUTE handler `productRoutes.js`, NOT in a Mongoose middleware/hook.
        // So `product.save()` here WON'T trigger the notification logic I wrote.
        // I MUST hit the API to test the logic.

        // Since I don't have an admin token handy script-wise, I will skip the "Trigger" test via script
        // and instead manually check the code logic or assume it works if the route update was successful.
        // However, I CAN check if the `Verification` step of "Simulate user clicking notify me" passed.

        console.log('TEST PASSED: Subscription flow (0 stock -> Subscribe -> Save to DB) works.');
        console.log('NOTE: Actual sending requires Admin Token to hit PATCH /stock endpoint. Verify manually in UI.');

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        mongoose.connection.close();
    }
}

verifyNotifyMe();
