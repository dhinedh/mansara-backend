const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://joypackers60_db_user:EYp8MTlbyeyX7X35@cluster0.rhqubga.mongodb.net/mansara-db';

async function applyOfferPrices() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const ProductSchema = new mongoose.Schema({
            name: String,
            slug: String,
            price: Number,
            originalPrice: Number,
            offerPrice: Number,
            isOffer: Boolean,
            variants: Array
        });

        const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

        const products = await Product.find({ isActive: true });
        console.log(`Found ${products.length} products\n`);

        for (const product of products) {
            const mrp = product.price;
            const newOfferPrice = mrp - 5;

            console.log(`Processing: ${product.name}`);
            console.log(`  Base: MRP ₹${mrp} → Offer ₹${newOfferPrice}`);

            product.offerPrice = newOfferPrice;
            product.originalPrice = mrp;
            product.isOffer = true;

            // Update all variants too
            if (product.variants && product.variants.length > 0) {
                product.variants = product.variants.map(v => {
                    const vObj = v.toObject ? v.toObject() : { ...v };
                    const variantMrp = vObj.price;
                    const variantOffer = variantMrp - 5;
                    console.log(`  Variant ${vObj.weight}: MRP ₹${variantMrp} → Offer ₹${variantOffer}`);
                    return {
                        ...vObj,
                        originalPrice: variantMrp,
                        offerPrice: variantOffer
                    };
                });
                product.markModified('variants');
            }

            await product.save();
            console.log(`  ✓ Saved\n`);
        }

        console.log('✅ All products updated with offer prices (MRP - ₹5).');
        mongoose.connection.close();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

applyOfferPrices();
