const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const { Product } = require('./models/Product');

const checkDiscounts = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const products = await Product.find({});
        console.log(`Found ${products.length} products.\n`);

        let violationCount = 0;

        products.forEach(p => {
            let hasIssue = false;
            let logMsg = `Product: ${p.name}\n`;

            // Check variants
            if (p.variants && p.variants.length > 0) {
                p.variants.forEach(v => {
                    if (v.price && v.offerPrice) {
                        const discount = (v.price - v.offerPrice) / v.price;
                        const pct = (discount * 100).toFixed(2);

                        logMsg += `  Variant ${v.weight}: Price ${v.price}, Offer ${v.offerPrice} -> ${pct}%`;

                        if (discount < 0.1) {
                            logMsg += ` [VIOLATION < 10%]`;
                            hasIssue = true;
                            violationCount++;
                        } else {
                            logMsg += ` [OK]`;
                        }
                        logMsg += `\n`;
                    }
                });
            }

            // Check top level
            if (p.price && p.offerPrice) {
                const discount = (p.price - p.offerPrice) / p.price;
                const pct = (discount * 100).toFixed(2);

                logMsg += `  Top Level: Price ${p.price}, Offer ${p.offerPrice} -> ${pct}%`;

                if (discount < 0.1) {
                    logMsg += ` [VIOLATION < 10%]`;
                    hasIssue = true;
                    violationCount++;
                } else {
                    logMsg += ` [OK]`;
                }
                logMsg += `\n`;
            }

            if (hasIssue) {
                console.log(logMsg);
            }
        });

        if (violationCount === 0) {
            console.log('\nALL PRODUCTS PASS: All have >= 10% discount.');
        } else {
            console.log(`\nFOUND ${violationCount} VIOLATIONS.`);
        }

        process.exit(0);

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkDiscounts();
