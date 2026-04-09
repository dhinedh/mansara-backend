const iCarryService = require('./utils/iCarryService');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function testFinal() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Order = require('./models/Order');
        const order = await Order.findOne(); // Any order
        
        if (!order) {
            console.log('No order found to test with');
            process.exit();
        }

        console.log('Testing createShipment with improved error handling...');
        const result = await iCarryService.createShipment(order);
        console.log('RESULT_SUCCESS:', result.success);
        console.log('RESULT_ERROR:', result.error);
        
        process.exit();
    } catch (err) {
        console.error('Test Error:', err);
        process.exit(1);
    }
}

testFinal();
