require('dotenv').config();
const mongoose = require('mongoose');

async function fixBlackRiceVariants() {
    try {
        console.log('Current working directory:', process.cwd());
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found in environment');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        let uri = process.env.MONGODB_URI;

        console.log('URI length:', uri.length);
        console.log('URI includes "appName":', uri.includes('appName'));

        // Debug regex matching
        const match = uri.match(/appName=([^&]*)/);
        if (match) {
            console.log('Found appName param with value:', `"${match[1]}"`);
        } else {
            console.log('No appName=... found');
        }

        // Robust cleanup for any appName param
        // Remove appName=value
        uri = uri.replace(/[?&]appName=[^&]*/g, '');
        // Remove appName (flag)
        uri = uri.replace(/[?&]appName(?=&|$)/g, '');

        // Fix up delimiters
        if (uri.includes('?') && !uri.includes('=')) { // if only ? left
            // Could be dangerous if base uri has no query params.
            // If uri ends with ?, remove it
            if (uri.endsWith('?')) uri = uri.slice(0, -1);
        }
        // Replace double &
        uri = uri.replace(/&&/g, '&');
        // Remove trailing &
        if (uri.endsWith('&')) uri = uri.slice(0, -1);

        // If query string became empty but still has ?, remove it
        if (uri.endsWith('?')) uri = uri.slice(0, -1);

        console.log('Cleaned URI length:', uri.length);

        await mongoose.connect(uri);
        console.log('✅ Connected');

        const { Product } = require('../models/Product');

        console.log('Searching for "Black Rice Delight Porridge Mix"...');
        const product = await Product.findOne({ name: "Black Rice Delight Porridge Mix" });

        if (!product) {
            // Try explicit regex in case of case sensitivity or spaces issue
            const p2 = await Product.findOne({ name: { $regex: /Black Rice Delight Porridge Mix/i } });
            if (p2) {
                console.log('Found product via regex match instead');
                // process p2...
                processProduct(p2);
                return;
            }
            console.error('❌ Product not found!');
            process.exit(1);
        } else {
            await processProduct(product);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

async function processProduct(product) {
    console.log(`Found product: ${product.name}`);
    console.log('Current variants:', JSON.stringify(product.variants, null, 2));

    const initialCount = product.variants.length;
    product.variants = product.variants.filter(v =>
        !v.weight.toLowerCase().includes('500g') &&
        !v.weight.toLowerCase().includes('500 g')
    );

    if (product.variants.length < initialCount) {
        console.log('🗑️  Removed 500g variant(s).');
        await product.save();
        console.log('✅ Product updated successfully.');
        console.log('New variants:', JSON.stringify(product.variants, null, 2));
    } else {
        console.log('ℹ️  No "500g" variant found to remove.');
    }
}

fixBlackRiceVariants();
