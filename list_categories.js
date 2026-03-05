require('dotenv').config();
const mongoose = require('mongoose');

async function listCategories() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const Category = require('./models/Category');
        const categories = await Category.find({}).lean();
        console.log(JSON.stringify(categories, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

listCategories();
