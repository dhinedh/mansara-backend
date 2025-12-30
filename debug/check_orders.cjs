require('dotenv').config({ path: './backend/.env' });
const mongoose = require('mongoose');
const Order = require('../backend/models/Order');
const User = require('../backend/models/User');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const orders = await Order.find({}).sort({ createdAt: -1 }).limit(5).populate('user');

        console.log('--- LATEST 5 ORDERS ---');
        orders.forEach(order => {
            console.log(`Order ID: ${order.orderId || order._id}`);
            console.log('Delivery Address:', JSON.stringify(order.deliveryAddress, null, 2));
            console.log('User Phone (Populated):', order.user?.phone);
            console.log('User WhatsApp (Populated):', order.user?.whatsapp);
            console.log('-----------------------');
        });

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

run();
