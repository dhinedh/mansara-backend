require('dotenv').config();
const mongoose = require('mongoose');

async function updateImage() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }

        console.log('Connecting...');
        await mongoose.connect(process.env.MONGODB_URI);

        const { Product } = require('../models/Product');

        console.log('Updating Millet Fusion Idly Podi image...');

        const result = await Product.findOneAndUpdate(
            { name: "Millet Fusion Idly Podi" },
            {
                $set: {
                    image: "/products/millet-idly-podi-front.jpg",
                    images: [
                        "/products/millet-idly-podi-front.jpg",
                        "/products/millet-idly-podi-back.jpg",
                        "/products/millet-idly-podi-side.jpg"
                    ]
                }
            },
            { new: true }
        );

        if (result) {
            console.log('✅ Image updated successfully!');
            console.log('Image Path:', result.image);
        } else {
            console.error('❌ Product "Millet Fusion Idly Podi" not found!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

updateImage();
