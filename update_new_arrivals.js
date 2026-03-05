require('dotenv').config();
const mongoose = require('mongoose');

async function updateNewArrivals() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const { Product } = require('./models/Product');

        console.log('[New Arrivals] Updating products...');

        // Clear New Arrival for all products first
        const clearResult = await Product.updateMany({}, { isNewArrival: false });
        console.log(`✅ Cleared New Arrival for ${clearResult.modifiedCount} products`);

        // Set New Arrival for Ragi Choco Malt
        const updateResult = await Product.updateOne({ slug: 'ragi-choco-malt' }, { isNewArrival: true });
        if (updateResult.modifiedCount > 0 || updateResult.matchedCount > 0) {
            console.log('✅ Set isNewArrival: true for Ragi Choco Malt');
        } else {
            console.warn('⚠️ Ragi Choco Malt not found in database');
        }

        console.log('🎉 Database updated successfully!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

updateNewArrivals();
