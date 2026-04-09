const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

async function updateProducts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const { Product } = require('../models/Product');
        
        // Update Ragi Choco Malt
        const ragiResult = await Product.updateMany(
            { name: /Ragi Choco Malt/i },
            { 
                $set: { 
                    price: 250, 
                    originalPrice: 250, 
                    isOffer: false, 
                    offerPrice: 0, 
                    offerText: "" 
                } 
            }
        );
        console.log(`Ragi Choco Malt: Updated ${ragiResult.modifiedCount} documents.`);

        // Update Nutriminix
        const nutriminixResult = await Product.updateMany(
            { name: /Nutriminix/i },
            { 
                $set: { 
                    price: 200, 
                    originalPrice: 200, 
                    isOffer: false, 
                    offerPrice: 0, 
                    offerText: "" 
                } 
            }
        );
        console.log(`Nutriminix: Updated ${nutriminixResult.modifiedCount} documents.`);
        
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateProducts();
