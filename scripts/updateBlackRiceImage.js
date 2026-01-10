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

        console.log('Updating Black Rice Delight image...');

        const result = await Product.findOneAndUpdate(
            { name: "Black Rice Delight Porridge Mix" },
            {
                $set: {
                    image: "/products/black-rice-delight-front.jpg",
                    images: [
                        "/products/black-rice-delight-front.jpg",
                        "/products/black-rice-delight-back.jpg",
                        "/products/black-rice-delight-side.jpg"
                    ]
                }
            },
            { new: true }
        );

        if (result) {
            console.log('✅ Image updated successfully!');
            console.log('Image Path:', result.image);
        } else {
            console.error('❌ Product "Black Rice Delight Porridge Mix" not found!');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

updateImage();
