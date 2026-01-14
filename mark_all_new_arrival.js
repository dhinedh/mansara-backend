const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const { Product } = require('./models/Product');

const updateNewArrivals = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log('Marking ALL products (both top-level and variants if applicable) as "New Arrival"...');

        // Note: isNewArrival is typically a flag on the product document itself
        const result = await Product.updateMany(
            {},
            { $set: { isNewArrival: true } }
        );

        console.log(`Updated ${result.matchedCount} products.`);
        console.log(`Modified: ${result.modifiedCount}`);

        process.exit(0);

    } catch (error) {
        console.error('Error updating new arrivals:', error);
        process.exit(1);
    }
};

updateNewArrivals();
