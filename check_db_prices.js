const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    offerPrice: Number,
    isOffer: Boolean
}, { collection: 'products', strict: false });

const Product = mongoose.model('Product', productSchema);

async function checkPrices() {
    try {
        await mongoose.connect(MONGODB_URI);
        const products = await Product.find({});
        console.log('--- Current DB Prices ---');
        products.forEach(p => {
            console.log(`${p.name || p.id}: Price=${p.price}, OfferPrice=${p.offerPrice}, isOffer=${p.isOffer}`);
        });
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

checkPrices();
