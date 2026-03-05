const mongoose = require('mongoose');
require('dotenv').config();

async function remove200gVariants() {
    const dbNames = ['test', 'mansara-db'];
    const baseUri = 'mongodb+srv://joypackers60_db_user:EYp8MTlbyeyX7X35@cluster0.rhqubga.mongodb.net/';

    for (const dbName of dbNames) {
        try {
            console.log(`\n>>> Removing 200g Variants from Database: ${dbName}`);
            const uri = `${baseUri}${dbName}?retryWrites=true&w=majority`;
            await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });

            const productsCol = mongoose.connection.db.collection('products');

            // Find all products and filter out 200g variants
            const products = await productsCol.find({}).toArray();

            for (const product of products) {
                if (product.variants && Array.isArray(product.variants)) {
                    const originalCount = product.variants.length;
                    const filteredVariants = product.variants.filter(v => v.weight !== '200g');

                    if (filteredVariants.length !== originalCount) {
                        console.log(`  Updating: ${product.name} (Removed 200g variant)`);
                        await productsCol.updateOne(
                            { _id: product._id },
                            {
                                $set: {
                                    variants: filteredVariants,
                                    updatedAt: new Date()
                                }
                            }
                        );
                    }
                }
            }

            console.log(`  200g variant removal complete for ${dbName}`);
            await mongoose.disconnect();
        } catch (error) {
            console.error(`  Error syncing ${dbName}:`, error.message);
            if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
        }
    }
}

remove200gVariants();
