const mongoose = require('mongoose');
require('dotenv').config();

async function fixComboPrice() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const { Product } = require('./models/Product');
        
        const result = await Product.updateMany(
            { slug: 'ultimate-wellness-combo-5-mixes' },
            { 
                $set: { 
                    price: 330, 
                    offerPrice: 330, 
                    originalPrice: 350,
                    comboPrice: 330,
                    isOffer: true
                } 
            }
        );
        
        console.log('Update result:', result);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
fixComboPrice();
