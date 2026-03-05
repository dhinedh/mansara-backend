require('dotenv').config();
const mongoose = require('mongoose');

async function updateStocks() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const { Product } = require('./models/Product');

        const updates = [
            { slug: 'urad-porridge-mix-classic', stock: 120 },
            { slug: 'urad-porridge-mix-salt-pepper', stock: 85 },
            { slug: 'urad-porridge-mix-millet-magic', stock: 95 },
            { slug: 'urad-porridge-mix-premium', stock: 110 },
            { slug: 'black-rice-delight-porridge-mix', stock: 75 },
            { slug: 'millet-fusion-idly-podi', stock: 150 },
            { slug: 'ragi-choco-malt', stock: 100 },
            { slug: 'ultimate-wellness-combo-5-mixes', stock: 50 }
        ];

        for (const update of updates) {
            const result = await Product.updateOne(
                { slug: update.slug },
                { $set: { stock: update.stock, isActive: true } }
            );
            console.log(`Updated ${update.slug}: ${result.modifiedCount} modified`);
        }

        console.log('✅ All stocks updated in database');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

updateStocks();
