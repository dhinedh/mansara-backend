require('dotenv').config();
const mongoose = require('mongoose');

async function findMissingProduct() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const { Product } = require('./models/Product');

        const knownSlugs = [
            'urad-porridge-mix-classic',
            'urad-porridge-mix-millet-magic',
            'urad-porridge-mix-premium',
            'black-rice-delight-porridge-mix',
            'millet-fusion-idly-podi',
            'ragi-choco-malt'
        ];

        const ps = await Product.find({ slug: { $nin: knownSlugs } }).lean();
        console.log(JSON.stringify(ps, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

findMissingProduct();
