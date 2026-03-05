const mongoose = require('mongoose');
require('dotenv').config();

const ragiChocoMalt = {
    name: "Ragi Choco Malt",
    slug: "ragi-choco-malt",
    category: new mongoose.Types.ObjectId("69a83fe41c2c00db0a9ba526"), // Health Drink Mix
    price: 70,
    offerPrice: 70,
    originalPrice: 70,
    isOffer: false,
    isActive: true,
    isNewArrival: true,
    isFeatured: true,
    stock: 50,
    weight: "100g",
    description: "A delicious and healthy Ragi Choco Malt drink for all ages.",
    image: "/products/ragi-choco-front.jpg",
    images: ["/products/ragi-choco-front.jpg"],
    highlights: ["Rich in Calcium", "No White Sugar", "Great for Kids"],
    variants: [
        { weight: "100g", price: 70, offerPrice: 70, stock: 50 },
        { weight: "250g", price: 180, offerPrice: 180, stock: 50 }
    ]
};

async function addMissingProduct() {
    try {
        const uri = 'mongodb+srv://joypackers60_db_user:EYp8MTlbyeyX7X35@cluster0.rhqubga.mongodb.net/test';
        await mongoose.connect(uri);

        const productsCol = mongoose.connection.db.collection('products');
        const exists = await productsCol.findOne({ slug: "ragi-choco-malt" });

        if (!exists) {
            console.log('Adding Ragi Choco Malt to test database...');
            await productsCol.insertOne({
                ...ragiChocoMalt,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('Product added successfully.');
        } else {
            console.log('Product already exists in test database.');
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

addMissingProduct();
