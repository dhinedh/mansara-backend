require('dotenv').config();
const mongoose = require('mongoose');

async function deleteAllCategories() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found in environment');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Import Category Model
        const Category = require('../models/Category');

        console.log('🗑️  Deleting all categories...');
        const result = await Category.deleteMany({});

        console.log(`✅ Deleted ${result.deletedCount} categories.`);

    } catch (error) {
        console.error('❌ Error deleting categories:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

deleteAllCategories();
