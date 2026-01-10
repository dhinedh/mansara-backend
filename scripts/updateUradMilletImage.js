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

        console.log('Updating Urad Porridge Mix – Millet Magic image...');

        const result = await Product.findOneAndUpdate(
            { name: "Urad Porridge Mix – Millet Magic" },
            {
                $set: {
                    image: "/products/urad-millet-magic-back.jpg",
                    images: [
                        "/products/urad-millet-magic-back.jpg",
                        "/products/urad-millet-magic-front.jpg",
                        "/products/urad-millet-magic-side.jpg"
                    ]
                }
            },
            { new: true }
        );

        if (result) {
            console.log('✅ Image updated successfully!');
            console.log('Image Path:', result.image);
        } else {
            console.error('❌ Product "Urad Porridge Mix – Millet Magic" not found!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

updateImage();
