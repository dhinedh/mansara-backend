const mongoose = require('mongoose');
require('dotenv').config();
const { Product, Combo } = require('./models/Product');

const updatePrices20Pct = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Update Products (excluding Combos)
        const products = await Product.find({ __t: { $ne: 'Combo' } });
        console.log(`Found ${products.length} products to update.`);

        for (const product of products) {
            console.log(`Updating product: ${product.name}`);

            // Update individual fields
            if (product.price) product.price = Math.round(product.price * 1.2);
            if (product.offerPrice) product.offerPrice = Math.round(product.offerPrice * 1.2);
            if (product.originalPrice) product.originalPrice = Math.round(product.originalPrice * 1.2);

            // Update variants
            if (product.variants && product.variants.length > 0) {
                // We need to use markModified if we update subdocuments directly sometimes,
                // but re-assigning the whole array usually works fine in Mongoose if it's a new array.
                product.variants = product.variants.map(v => {
                    // Convert to object to avoid Mongoose internal issues during mapping
                    const vObj = v.toObject ? v.toObject() : v;
                    const updatedV = { ...vObj };
                    if (updatedV.price) updatedV.price = Math.round(updatedV.price * 1.2);
                    if (updatedV.offerPrice) updatedV.offerPrice = Math.round(updatedV.offerPrice * 1.2);
                    return updatedV;
                });
            }

            await product.save();
            console.log(`  ✓ Updated ${product.name} (Base Price: ${product.price})`);
        }

        // 2. Update Combos
        const combos = await Combo.find({});
        console.log(`Found ${combos.length} combos to update.`);

        for (const combo of combos) {
            console.log(`Updating combo: ${combo.name}`);

            if (combo.price) combo.price = Math.round(combo.price * 1.2);
            if (combo.comboPrice) combo.comboPrice = Math.round(combo.comboPrice * 1.2);
            if (combo.originalPrice) combo.originalPrice = Math.round(combo.originalPrice * 1.2);
            if (combo.offerPrice) combo.offerPrice = Math.round(combo.offerPrice * 1.2);

            await combo.save();
            console.log(`  ✓ Updated ${combo.name} (Combo Price: ${combo.comboPrice})`);
        }

        console.log('✅ All database price updates complete (20% increase applied).');
    } catch (error) {
        console.error('❌ Error during database update:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

updatePrices20Pct();
