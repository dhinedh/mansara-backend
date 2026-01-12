const mongoose = require('mongoose');
require('dotenv').config();

const updateProducts = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const updates = [
            {
                name: "Urad Porridge Mix – Classic",
                variants: [
                    { weight: "100g", price: 55, stock: 50, offerPrice: 0 },
                    { weight: "200g", price: 105, stock: 50, offerPrice: 0 }
                ]
            },
            {
                name: "Urad Porridge Mix – Salt & Pepper",
                variants: [
                    { weight: "100g", price: 55, stock: 50, offerPrice: 0 },
                    { weight: "200g", price: 105, stock: 50, offerPrice: 0 }
                ]
            },
            {
                name: "Urad Porridge Mix – Millet Magic",
                variants: [
                    { weight: "100g", price: 60, stock: 50, offerPrice: 0 },
                    { weight: "200g", price: 115, stock: 50, offerPrice: 0 }
                ]
            },
            {
                name: "Urad Porridge Mix – Premium",
                variants: [
                    { weight: "100g", price: 65, stock: 50, offerPrice: 0 },
                    { weight: "200g", price: 125, stock: 50, offerPrice: 0 }
                ]
            },
            {
                name: "Black Rice Delight Porridge Mix",
                variants: [
                    { weight: "100g", price: 70, stock: 50, offerPrice: 0 },
                    { weight: "200g", price: 135, stock: 50, offerPrice: 0 }
                ]
            },
            {
                name: "Millet Fusion Idly Podi",
                variants: [
                    { weight: "100g", price: 75, stock: 50, offerPrice: 0 },
                    { weight: "200g", price: 145, stock: 50, offerPrice: 0 }
                ]
            }
        ];

        const Product = require('./models/Product').Product;

        for (const update of updates) {
            const product = await Product.findOne({ name: { $regex: new RegExp(update.name, 'i') } });

            if (product) {
                console.log(`Updating ${product.name}...`);

                // Update variants
                product.variants = update.variants;

                // Update base price to match the first variant (100g)
                product.price = update.variants[0].price;
                product.weight = update.variants[0].weight;
                product.stock = update.variants.reduce((acc, v) => acc + v.stock, 0); // Total stock

                await product.save();
                console.log(`✓ Updated ${product.name}`);
            } else {
                console.log(`! Product not found: ${update.name}`);
            }
        }

        console.log('All updates complete');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

updateProducts();
