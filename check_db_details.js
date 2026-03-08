const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

const productSchema = new mongoose.Schema({}, { collection: 'products', strict: false });
const Product = mongoose.model('Product', productSchema);

async function checkDetails() {
    try {
        await mongoose.connect(MONGODB_URI);
        const products = await Product.find({});
        console.log('--- DB Details ---');
        products.forEach(p => {
            const pObj = p.toObject();
            console.log(`Name: ${pObj.name}, _id: ${pObj._id}, id: ${pObj.id}, slug: ${pObj.slug}`);
        });
    } catch (error) {
        console.error(error);
    } finally {
        await mongoose.disconnect();
    }
}

checkDetails();
