require('dotenv').config();
const mongoose = require('mongoose');

async function deleteAllProducts() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found in environment');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Import Product Model
        // Note: Assuming model file path based on server.js structure
        const { Product } = require('../models/Product');

        console.log('🗑️  Deleting all products...');
        const result = await Product.deleteMany({});

        console.log(`✅ Deleted ${result.deletedCount} products.`);

        // Clear cache request to server? 
        // No easy way to clear server cache from here without hitting API.
        // But server cache is time based or keys based. It might serve stale data for 10 mins.
        // User should restart server or we can hit the /api/products/cache/clear endpoint if exists?
        // Checked comboRoutes: `/cache/clear` exists. ProductRoutes probably same.
        // But just deleting from DB is enough for now, user can restart server.

    } catch (error) {
        console.error('❌ Error deleting products:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

deleteAllProducts();
