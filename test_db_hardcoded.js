const mongoose = require('mongoose');

// Hardcoded URI for debugging
const uri = 'mongodb+srv://joypackers60_db_user:EYp8MTlbyeyX7X35@cluster0.rhqubga.mongodb.net/?appName=Cluster0';
console.log('Using URI:', uri);

mongoose.connect(uri)
    .then(() => {
        console.log('Connected to MongoDB');
        const { Product } = require('./models/Product');
        console.log('Product model loaded:', Product);
        process.exit(0);
    })
    .catch((err) => {
        console.error('Connection error:', err);
        process.exit(1);
    });
