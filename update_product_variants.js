require('dotenv').config();
const mongoose = require('mongoose');

async function updateProductVariants() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const { Product } = require('./models/Product');

        const products = [
            { slug: 'urad-porridge-mix-classic', p200: 105 },
            { slug: 'urad-porridge-mix-salt-pepper', p200: 105 },
            { slug: 'urad-porridge-mix-millet-magic', p200: 115 },
            { slug: 'urad-porridge-mix-premium', p200: 125 },
            { slug: 'black-rice-delight-porridge-mix', p200: 135 },
            { slug: 'millet-fusion-idly-podi', p200: 145 },
            { slug: 'ragi-choco-malt', p200: 180, w2: "250g" }
        ];

        for (const p of products) {
            const w2 = p.w2 || "200g";
            await Product.updateOne(
                { slug: p.slug },
                {
                    $set: {
                        weight: "100g",
                        price: 70,
                        offerPrice: 63,
                        originalPrice: 70,
                        isOffer: true,
                        variants: [
                            { weight: "100g", price: 70, offerPrice: 63, stock: 50 },
                            { weight: w2, price: p.p200, offerPrice: p.p200, stock: 50 }
                        ]
                    }
                }
            );
            console.log(`✅ Updated ${p.slug}`);
        }

        console.log('🎉 All products updated successfully with variants!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

updateProductVariants();
