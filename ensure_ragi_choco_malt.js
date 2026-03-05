require('dotenv').config();
const mongoose = require('mongoose');

const productData = {
    name: "Ragi Choco Malt",
    price: 180,
    offerPrice: 180,
    stock: 100,
    weight: "250g",
    short_description: "A nutritious millet-based chocolate drink made with wholesome natural ingredients for daily energy and growth.",
    description: "Mansara Ragi Choco Malt is a nutritious health drink mix that combines the powerhouse nutrition of Ragi (Finger Millet) with the irresistible taste of premium cocoa. Specially formulated to provide sustained energy, it is enriched with almonds, cashews, and traditional spices like cardamom and saffron. Perfect for growing children and health-conscious adults, it offers a clean, preservative-free alternative to commercial health drinks. Rich in calcium and dietary fiber, it supports bone health and overall wellness.",
    highlights: [
        "No preservatives",
        "Millet-based with natural cocoa",
        "Rich in calcium",
        "Kids friendly (2+ years)",
        "Enriched with Saffron & Almonds"
    ],
    ingredients: "Ragi (Finger Millet), Brown Sugar, Cocoa Powder, Cashew Nuts, Almonds, Dry Ginger, Cardamom, Saffron.",
    howToUse: "Mix 2 tbsp (approx. 25g) with milk or water. Cook on low flame with continuous stirring until smooth. Add sugar or jaggery if required. Serve warm as a hot drink or cold as a milkshake.",
    storage: "Store in a cool, dry place. Keep the container tightly closed. Use only a dry spoon.",
    image: "/products/ragi-choco-malt-front.png",
    images: [
        "/products/ragi-choco-malt-front.png",
        "/products/ragi-choco-malt-label.png"
    ],
    isActive: true,
    isFeatured: true,
    isNewArrival: true
};

async function ensureProduct() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found in environment');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const { Product } = require('./models/Product');
        const Category = require('./models/Category');

        // Find or Create Category
        let category = await Category.findOne({ name: "Health drink mix" });
        if (!category) {
            console.log('🌱 Creating category: Health drink mix');
            category = new Category({
                name: "Health drink mix",
                slug: "health-drink-mixes",
                description: "Nutritious and delicious health drink blends",
                isActive: true,
                order: 4
            });
            await category.save();
        }

        // Upsert Product
        const slug = productData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        const finalProductData = {
            ...productData,
            category: category._id,
            slug: slug
        };

        const result = await Product.findOneAndUpdate(
            { name: productData.name },
            finalProductData,
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(`✅ Product processed: ${result.name} (ID: ${result._id})`);
        console.log(`   Status: ${result.isActive ? 'Active' : 'Inactive'}, Stock: ${result.stock}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

ensureProduct();
