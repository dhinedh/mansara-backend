const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Order = require('./models/Order');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        try {
            const orders = await Order.find({}).populate('user', 'name email');
            console.log(`Found ${orders.length} orders in the database.`);

            if (orders.length > 0) {
                console.log('Sample Order:', JSON.stringify(orders[0], null, 2));
            } else {
                console.log('No orders found!');
            }
        } catch (err) {
            console.error('Error fetching orders:', err);
        } finally {
            mongoose.disconnect();
        }
    })
    .catch(err => {
        console.error('DB Connection Error:', err);
    });
