const mongoose = require('mongoose');
require('dotenv').config();

async function checkCollections() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections in mansara-db:');
        collections.forEach(c => console.log(`- ${c.name}`));
        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkCollections();
