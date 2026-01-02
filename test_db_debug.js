const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function testConnection() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Try to access collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Collections:', collections.map(c => c.name));

        // Try a simple query on a model if possible, or just raw db query
        if (collections.find(c => c.name === 'contents')) {
            const count = await mongoose.connection.db.collection('contents').countDocuments();
            console.log('Contents count:', count);
        }

        process.exit(0);
    } catch (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }
}

testConnection();
