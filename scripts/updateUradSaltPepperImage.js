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

        console.log('Updating Urad Porridge Mix – Salt & Pepper image...');

        const result = await Product.findOneAndUpdate(
            { name: "Urad Porridge Mix – Salt & Pepper" },
            {
                $set: {
                    image: "/products/urad-salt-pepper-front.jpg",
                    images: [
                        "/products/urad-salt-pepper-front.jpg",
                        "/products/urad-salt-pepper-back.jpg",
                        "/products/urad-salt-pepper-side.jpg"
                    ]
                }
            },
            { new: true }
        );

        if (result) {
            console.log('✅ Image updated successfully!');
            console.log('Image Path:', result.image);
            console.log('Images:', result.images);
        } else {
            console.error('❌ Product "Urad Porridge Mix – Salt & Pepper" not found!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

updateImage();
