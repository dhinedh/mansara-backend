require('dotenv').config();
const mongoose = require('mongoose');

const products = [
    {
        name: "Urad Porridge Mix – Classic",
        categoryName: "Urad Porridge Mix",
        price: 105,
        offerPrice: 105,
        stock: 0, // Set default > 0 so it shows
        weight: "200g",
        short_description: "A traditional, wholesome porridge made with simple, time-tested ingredients for daily nourishment and easy digestion.",
        description: "Mansara Urad Porridge Mix – Classic is a time-honoured South Indian health drink made using carefully selected urad dal, processed using traditional roasting techniques to retain nutrition and flavour. This porridge is naturally rich in plant protein, dietary fibre, calcium, and iron, making it ideal for daily consumption across all age groups. It supports muscle strength, digestion, bone health, and sustained energy throughout the day.",
        ingredients: "Black Gram (67%), Black Rice (33%), Dry Ginger, Cardamom.",
        howToUse: "Take 2 tablespoons of mix. Add 250 ml of water, cook on medium flame for 10 minutes stirring continuously. Add Salt/Pepper/Jaggery to taste and serve warm.",
        storage: "Store in a cool, dry place; keep airtight.",
        highlights: ["No preservatives", "Single-source ingredients", "Rich in Calcium & Iron", "Suitable for babies (6+ months) to elders"],
        image: "/products/urad-classic-front.jpg",
        images: [
            "/products/urad-classic-front.jpg",
            "/products/urad-classic-back.jpg",
            "/products/urad-classic-side.jpg"
        ]
    },
    {
        name: "Urad Porridge Mix – Salt & Pepper",
        categoryName: "Urad Porridge Mix",
        price: 105,
        offerPrice: 105,
        stock: 0,
        weight: "200g",
        short_description: "A savoury porridge variant infused with pepper and cumin, ideal for light meals and comfort food needs.",
        description: "Mansara Urad Porridge Mix – Salt & Pepper is a savoury twist on the traditional ulunthankanji, infused with natural spices like pepper and mild seasoning for a comforting yet flavourful experience. Designed for people who prefer non-sweet, light meals, this porridge aids digestion, gut health, and metabolism, while still delivering high-quality protein and essential minerals.",
        ingredients: "Black Gram (60.9%), Kavuni Rice (30%), Black Pepper (4.55%), Cumin Seeds (2.73%), Salt (1.82%).",
        howToUse: "Take 2 tablespoons of mix. Add 250 ml of water, cook on medium flame for 10 minutes stirring continuously to avoid lumps, and serve warm.",
        storage: "Store in a cool, dry place.",
        highlights: ["No artificial flavours", "Digestive spices", "Savoury taste", "Good for gut health"],
        image: "/products/urad-salt-pepper-front.jpg",
        images: [
            "/products/urad-salt-pepper-front.jpg",
            "/products/urad-salt-pepper-back.jpg",
            "/products/urad-salt-pepper-side.jpg"
        ]
    },
    {
        name: "Urad Porridge Mix – Millet Magic",
        categoryName: "Urad Porridge Mix",
        price: 115,
        offerPrice: 115,
        stock: 0,
        weight: "200g",
        short_description: "A nutritious porridge mix crafted with premium black gram and a carefully balanced selection of traditional millets.",
        description: "Mansara Millet Magic Urad Porridge Mix blends the goodness of urad dal with selected traditional millets, creating a nutritionally superior porridge for modern lifestyles. Millets are naturally rich in fibre, micronutrients, and slow-release carbohydrates, helping maintain stable energy levels and better blood sugar balance. Combined with urad dal, this porridge supports gut health and heart health.",
        ingredients: "Black Gram (49.02%), Foxtail Millet (12.75%), Little Millet (12.75%), Barnyard Millet (12.75%), Kodo Millet (12.75%).",
        howToUse: "Take 2 tablespoons of mix. Add 250 ml of water, cook on medium flame for 10 minutes stirring continuously. Add Salt/Pepper/Jaggery to taste and serve warm.",
        storage: "Store in a cool, dry place.",
        highlights: ["Millet-based", "Clean label", "High Fibre", "Diabetic-friendly", "Sustained Energy"],
        image: "/products/urad-millet-magic-front.jpg",
        images: [
            "/products/urad-millet-magic-front.jpg",
            "/products/urad-millet-magic-back.jpg",
            "/products/urad-millet-magic-side.jpg"
        ]
    },
    {
        name: "Urad Porridge Mix – Premium",
        categoryName: "Urad Porridge Mix",
        price: 125,
        offerPrice: 125,
        stock: 0,
        weight: "200g",
        short_description: "A premium porridge blend formulated with black gram, ragi, and a diverse selection of traditional Indian rice varieties.",
        description: "Mansara Premium Urad Porridge Mix is a carefully crafted blend designed for those who want maximum nutrition in every serving. It includes enhanced proportions of protein-rich pulses and traditional ingredients to support strength, stamina, and immunity. This variant is ideal during recovery phases, high physical activity, or nutritional gaps.",
        ingredients: "Black Gram, Ragi, Kavuni Rice, Mappillai Samba Rice, Bamboo Rice, Red Rice, Hand-Pounded Rice.",
        howToUse: "Take 2 tablespoons of mix. Add 250 ml of water, cook on medium flame for 10 minutes stirring continuously. Add Salt/Pepper/Jaggery to taste and serve warm.",
        storage: "Store in a cool, dry place.",
        highlights: ["Finer grind", "Premium processing", "Multi-Grain", "High Nutrition", "Immunity Support"],
        image: "/products/urad-premium-front.jpg",
        images: [
            "/products/urad-premium-front.jpg",
            "/products/urad-premium-back.jpg",
            "/products/urad-premium-side.jpg"
        ]
    },
    {
        name: "Black Rice Delight Porridge Mix",
        categoryName: "Black Rice mix",
        price: 135,
        offerPrice: 135,
        stock: 0,
        weight: "200g",
        short_description: "A wholesome porridge blend formulated with traditional black rice (kavuni) and a balanced mix of grains including wheat and barley.",
        description: "Mansara Black Rice Delight Porridge Mix is made using traditional black rice (Karuppu Kavuni Arisi), known for its powerful antioxidant properties and mineral richness. Naturally high in iron, fibre, and anthocyanins, this porridge supports heart health, improved digestion, and sustained energy. Its earthy flavour and rich colour make it both nutritious and visually appealing.",
        ingredients: "Kavuni Rice (49.50%), Samba Wheat (24.75%), Barley (12.87%), Horse Gram (12.87%).",
        howToUse: "Take 2 tablespoons of mix. Add 250 ml of water, cook on medium flame for 10 minutes stirring continuously. Add Salt/Pepper/Jaggery to taste and serve warm.",
        storage: "Store in a cool, dry place.",
        highlights: ["No added spices", "Grain-forward", "Antioxidant Rich", "Iron Rich", "Heart Healthy"],
        image: "/products/black-rice-delight-front.jpg",
        images: [
            "/products/black-rice-delight-front.jpg",
            "/products/black-rice-delight-back.jpg",
            "/products/black-rice-delight-side.jpg"
        ]
    },
    {
        name: "Millet Fusion Idly Podi",
        categoryName: "Millet fusion mix",
        price: 145,
        offerPrice: 145,
        stock: 0,
        weight: "200g",
        short_description: "A flavourful South Indian-style condiment formulated with a combination of lentils, traditional millets, and natural spices.",
        description: "Mansara Millet Fusion Idly Podi is a wholesome blend of traditional millets, pulses, and spices, roasted and ground to perfection. Unlike regular podis, this fusion version adds extra protein, fibre, and micronutrients, making everyday idly or dosa meals healthier and more filling. No artificial colours, no excess oil — just authentic flavour and nutrition.",
        ingredients: "Urad Dal, Bengal Gram, Green Gram, Millets (Foxtail, Little, Barnyard, Kodo), Dry Red Chilli, Kashmiri Chilli, Spices.",
        howToUse: "Mix with required quantity of Ghee or Gingelly oil. Use it with Idly, Dosa, Chapatti, Poori, etc.",
        storage: "Store in a cool, dry place.",
        highlights: ["No preservatives", "Traditional roast & grind", "Protein Rich", "Spicy & Savoury"],
        image: "/products/millet-idly-podi-front.jpg",
        images: [
            "/products/millet-idly-podi-front.jpg",
            "/products/millet-idly-podi-back.jpg",
            "/products/millet-idly-podi-side.jpg"
        ]
    }
];

async function seedProducts() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found in environment');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const { Product } = require('../models/Product');
        const Category = require('../models/Category');

        console.log('🌱 Seeding products...');

        for (const item of products) {
            // Find category
            const category = await Category.findOne({ name: item.categoryName });
            if (!category) {
                console.warn(`⚠️ Category not found for ${item.name}: ${item.categoryName}`);
                continue;
            }

            // Create product object
            const productData = {
                ...item,
                category: category._id, // Link to category ID
                // Generate slug
                slug: item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
                isActive: true,
                isNewArrival: true
            };

            // Remove helper field
            delete productData.categoryName;

            await Product.findOneAndUpdate(
                { name: item.name },
                productData,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`   ✓ Processed: ${item.name}`);
        }

        console.log(`✅ Successfully seeded ${products.length} products.`);

    } catch (error) {
        console.error('❌ Error seeding products:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seedProducts();
