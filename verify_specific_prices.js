const mongoose = require('mongoose');
require('dotenv').config();
const { Product } = require('./models/Product');

const verifyPrices = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const slugs = [
            'ragi-choco-malt',
            'nutrimix-super-health-mix',
            'urad-porridge-mix-classic',
            'traditional-idly-podi'
        ];

        for (const slug of slugs) {
            const product = await Product.findOne({ slug });
            if (product) {
                console.log(`Product: ${product.name} (${slug})`);
                console.log(`  Base Weight: ${product.weight}`);
                console.log(`  Base Price: ${product.price}`);
                console.log(`  Base Offer: ${product.offerPrice}`);
                console.log(`  isOffer: ${product.isOffer}`);

                if (product.variants && product.variants.length > 0) {
                    console.log('  Variants:');
                    product.variants.forEach(v => {
                        console.log(`    - ${v.weight}: Price ${v.price}, Offer ${v.offerPrice}`);
                    });
                }
            } else {
                console.log(`❌ Product not found: ${slug}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

verifyPrices();
