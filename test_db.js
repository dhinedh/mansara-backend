const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

console.log('URI:', process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI)
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
