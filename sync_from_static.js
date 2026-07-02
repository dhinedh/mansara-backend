const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const productsTsPath = path.join(__dirname, '../mansara-nourish-hub/src/data/products.ts');
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in env');
    process.exit(1);
}

console.log('Reading products.ts from:', productsTsPath);
const tsContent = fs.readFileSync(productsTsPath, 'utf8');

function extractArray(content, name) {
    const startIndex = content.indexOf(`export const ${name}`);
    if (startIndex === -1) {
        throw new Error(`Could not find declaration for ${name}`);
    }
    const equalsIndex = content.indexOf('=', startIndex);
    if (equalsIndex === -1) {
        throw new Error(`Could not find equals sign for ${name}`);
    }
    const firstBracket = content.indexOf('[', equalsIndex);
    if (firstBracket === -1) {
        throw new Error(`Could not find opening bracket for ${name}`);
    }
    
    let bracketCount = 1;
    let index = firstBracket + 1;
    while (bracketCount > 0 && index < content.length) {
        if (content[index] === '[') bracketCount++;
        else if (content[index] === ']') bracketCount--;
        index++;
    }
    const arrayStr = content.substring(firstBracket, index);
    return eval(arrayStr);
}

let staticData;
try {
    const products = extractArray(tsContent, 'products');
    const combos = extractArray(tsContent, 'combos');
    const categories = extractArray(tsContent, 'categories');
    staticData = { products, combos, categories };
    console.log(`Successfully parsed static data:`);
    console.log(`  - Products: ${staticData.products.length}`);
    console.log(`  - Combos: ${staticData.combos.length}`);
    console.log(`  - Categories: ${staticData.categories.length}`);
} catch (err) {
    console.error('❌ Failed to parse products file:', err.message);
    process.exit(1);
}

async function sync() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const { Product } = require('./models/Product');

        // Sync Products
        for (const staticP of staticData.products) {
            const query = { slug: staticP.slug };
            const dbP = await Product.findOne(query);

            if (dbP) {
                console.log(`Updating ${dbP.name} (${dbP.slug}):`);
                console.log(`  - Price: ${dbP.price} -> ${staticP.price}`);
                console.log(`  - OfferPrice: ${dbP.offerPrice} -> ${staticP.offerPrice}`);
                console.log(`  - OriginalPrice: ${dbP.originalPrice} -> ${staticP.originalPrice}`);

                dbP.price = staticP.price;
                dbP.offerPrice = staticP.offerPrice;
                dbP.originalPrice = staticP.originalPrice || staticP.price;
                dbP.isOffer = staticP.isOffer;
                dbP.isNewArrival = staticP.isNewArrival;
                dbP.isFeatured = staticP.isFeatured;
                
                // Keep variants in sync
                if (staticP.variants && staticP.variants.length > 0) {
                    dbP.variants = staticP.variants.map(v => ({
                        weight: v.weight,
                        price: v.price,
                        offerPrice: v.offerPrice,
                        originalPrice: v.originalPrice || v.price,
                        stock: v.stock || 50,
                        sku: v.sku
                    }));
                    dbP.markModified('variants');
                }

                await dbP.save();
                console.log(`  ✓ Saved ${dbP.name}`);
            } else {
                console.log(`⚠️ Product not found in DB: ${staticP.name} (${staticP.slug})`);
            }
        }

        // Sync Combos
        for (const staticC of staticData.combos) {
            const query = { slug: staticC.slug, __t: 'Combo' };
            const dbC = await Product.findOne(query);

            if (dbC) {
                console.log(`Updating combo ${dbC.name}:`);
                console.log(`  - Price: ${dbC.price} -> ${staticC.comboPrice}`);
                console.log(`  - originalPrice: ${dbC.originalPrice} -> ${staticC.originalPrice}`);

                dbC.price = staticC.comboPrice;
                dbC.offerPrice = staticC.comboPrice;
                dbC.originalPrice = staticC.originalPrice;
                dbC.comboPrice = staticC.comboPrice;

                await dbC.save();
                console.log(`  ✓ Saved combo ${dbC.name}`);
            } else {
                console.log(`⚠️ Combo not found in DB: ${staticC.name} (${staticC.slug})`);
            }
        }

        console.log('\n🎉 Price synchronization from static products to MongoDB completed successfully!');
    } catch (err) {
        console.error('❌ Sync failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

sync();
