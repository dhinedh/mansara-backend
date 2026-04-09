const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  salePrice: Number,
  weight: String
}, { strict: false });

const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

async function checkProduct() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const products = await Product.find({ name: /Ragi Choco Malt/i });
        console.log('PRODUCTS_FOUND:');
        products.forEach(p => {
            console.log(`- ${p.name}: Price=${p.price}, SalePrice=${p.salePrice}, Weight=${p.weight || 'N/A'}`);
        });
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkProduct();
