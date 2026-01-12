const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Product } = require('./models/Product');

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};

const updates = [
    {
        name: /Urad Porridge Mix – Classic/i,
        variants: [
            { weight: '100g', price: 55, stock: 100 },
            { weight: '200g', price: 105, stock: 100 }
        ]
    },
    {
        name: /Urad Porridge Mix – Salt & Pepper/i,
        variants: [
            { weight: '100g', price: 55, stock: 100 },
            { weight: '200g', price: 105, stock: 100 }
        ]
    },
    {
        name: /Urad Porridge Mix – Millet Magic/i,
        variants: [
            { weight: '100g', price: 60, stock: 100 },
            { weight: '200g', price: 115, stock: 100 }
        ]
    },
    {
        name: /Urad Porridge Mix – Premium/i,
        variants: [
            { weight: '100g', price: 65, stock: 100 },
            { weight: '200g', price: 125, stock: 100 }
        ]
    },
    {
        name: /Black Rice Delight Porridge Mix/i,
        variants: [
            { weight: '100g', price: 70, stock: 100 },
            { weight: '200g', price: 135, stock: 100 }
        ]
    },
    {
        name: /Millet Fusion Idly Podi/i,
        variants: [
            { weight: '100g', price: 75, stock: 100 },
            { weight: '200g', price: 145, stock: 100 }
        ]
    }
];

const runMigration = async () => {
    await connectDB();

    for (const update of updates) {
        try {
            const product = await Product.findOne({ name: update.name });
            if (product) {
                console.log(`Updating ${product.name}...`);
                product.variants = update.variants;
                // Update base price to match the first variant (base variant)
                product.price = update.variants[0].price;
                product.weight = update.variants[0].weight;
                await product.save();
                console.log(`✓ Updated ${product.name}`);
            } else {
                console.log(`✗ Product not found matching: ${update.name}`);
            }
        } catch (error) {
            console.error(`Error updating product matching ${update.name}:`, error);
        }
    }

    console.log('Migration complete.');
    process.exit(0);
};

runMigration();
