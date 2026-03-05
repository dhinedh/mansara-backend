require('dotenv').config();
const mongoose = require('mongoose');

const products = [
    {
        name: "Urad Health Mix – Classic",
        categoryName: "Urad Porridge Mix",
        price: 55,
        stock: 50,
        weight: "100g",
        short_description: "A traditional, wholesome health mix.",
        description: "Mansara Classic Urad Health Mix is a time-honoured South Indian health drink.",
        ingredients: "Black Gram (67%), Black Rice (33%), Dry Ginger, Cardamom.",
        howToUse: "Take 2 tablespoons of mix. Add 250 ml of water, cook on medium flame for 10 minutes.",
        storage: "Store in a cool, dry place.",
        highlights: ["No preservatives", "Rich in Calcium & Iron"],
        image: "/products/urad-classic-front.jpg",
        images: ["/products/urad-classic-front.jpg"],
        isActive: true,
        isNewArrival: false,
        isFeatured: true,
        variants: [
            { weight: "100g", price: 55, stock: 50 },
            { weight: "200g", price: 105, stock: 50 },
            { weight: "250g", price: 140, stock: 50 }
        ]
    },
    {
        name: "Urad Health Mix – Salt n Pepper",
        categoryName: "Urad Porridge Mix",
        price: 55,
        stock: 50,
        weight: "100g",
        description: "Mansara Urad Health Mix – Salt n Pepper is a savoury twist on the traditional kanji.",
        ingredients: "Black Gram, Kavuni Rice, Black Pepper, Cumin Seeds, Salt.",
        howToUse: "Take 2 tablespoons of mix. Add 250 ml of water, cook on medium flame for 10 minutes.",
        storage: "Store in a cool, dry place.",
        highlights: ["Digestive spices", "Savoury taste"],
        image: "/products/urad-salt-pepper-front.jpg",
        images: ["/products/urad-salt-pepper-front.jpg"],
        isActive: true,
        isNewArrival: false,
        isFeatured: false,
        variants: [
            { weight: "100g", price: 55, stock: 50 },
            { weight: "200g", price: 105, stock: 50 },
            { weight: "250g", price: 140, stock: 50 }
        ]
    },
    {
        name: "Urad Health Mix – Millet Magic",
        categoryName: "Urad Porridge Mix",
        price: 60,
        stock: 50,
        weight: "100g",
        description: "Mansara Millet Magic Urad Health Mix blends black gram with traditional millets.",
        ingredients: "Black Gram, Finger Millet, Foxtail Millet...",
        howToUse: "Take 2 tablespoons of mix. Add 250 ml of water, cook for 10 minutes.",
        storage: "Store in a cool, dry place.",
        highlights: ["Millet-based", "High Fibre"],
        image: "/products/urad-millet-magic-front.jpg",
        images: ["/products/urad-millet-magic-front.jpg"],
        isActive: true,
        isNewArrival: false,
        isFeatured: false,
        variants: [
            { weight: "100g", price: 60, stock: 50 },
            { weight: "200g", price: 115, stock: 50 },
            { weight: "250g", price: 150, stock: 50 }
        ]
    },
    {
        name: "Urad Health Mix – Premium",
        categoryName: "Urad Porridge Mix",
        price: 65,
        stock: 50,
        weight: "100g",
        description: "Mansara Premium Urad Health Mix is designed for maximum nutrition.",
        ingredients: "Black Gram, Ragi, Kavuni Rice...",
        howToUse: "Take 2 tablespoons of mix. Add 250 ml of water, cook for 10 minutes.",
        storage: "Store in a cool, dry place.",
        highlights: ["Multi-Grain", "Immunity Support"],
        image: "/products/urad-premium-front.jpg",
        images: ["/products/urad-premium-front.jpg"],
        isActive: true,
        isNewArrival: false,
        isFeatured: false,
        variants: [
            { weight: "100g", price: 65, stock: 50 },
            { weight: "200g", price: 125, stock: 50 },
            { weight: "250g", price: 160, stock: 50 }
        ]
    },
    {
        name: "Health Mix – Black Rice Delight",
        categoryName: "Black Rice mix",
        price: 70,
        stock: 50,
        weight: "100g",
        description: "Mansara Black Rice Delight Health Mix is made using Karuppu Kavuni Arisi.",
        ingredients: "Kavuni Rice, Samba Wheat, Barley...",
        howToUse: "Take 2 tablespoons of mix. Add 250 ml of water, cook for 10 minutes.",
        storage: "Store in a cool, dry place.",
        highlights: ["Antioxidant Rich", "Heart Healthy"],
        image: "/products/black-rice-delight-front.jpg",
        images: ["/products/black-rice-delight-front.jpg"],
        isActive: true,
        isNewArrival: false,
        isFeatured: false,
        variants: [
            { weight: "100g", price: 70, stock: 50 },
            { weight: "200g", price: 135, stock: 50 },
            { weight: "250g", price: 180, stock: 50 }
        ]
    },
    {
        name: "Idly Podi – Traditional",
        categoryName: "Idly Podi",
        price: 75,
        stock: 100,
        weight: "100g",
        description: "A classic South Indian idly podi.",
        ingredients: "Black Gram, Bengal Gram, Green Gram...",
        howToUse: "Mix with gingelly oil or ghee.",
        storage: "Store in a cool, dry place.",
        highlights: ["Authentic roast & grind"],
        image: "/products/TraditionalIdlyPodi.PNG",
        images: ["/products/TraditionalIdlyPodi.PNG"],
        isActive: true,
        isNewArrival: false,
        isFeatured: false,
        variants: [{ weight: "100g", price: 75, stock: 100 }]
    },
    {
        name: "Idly Podi – Millet Fusion",
        categoryName: "Idly Podi",
        price: 75,
        stock: 100,
        weight: "100g",
        description: "A nutritious millet-enriched idly podi.",
        ingredients: "Urad Dal, Bengal Gram, Millets...",
        howToUse: "Mix with gingelly oil or ghee.",
        storage: "Store in a cool, dry place.",
        highlights: ["Millet enriched"],
        image: "/products/MilletFusionIdlyPodi.PNG",
        images: ["/products/MilletFusionIdlyPodi.PNG"],
        isActive: true,
        isNewArrival: false,
        isFeatured: false,
        variants: [{ weight: "100g", price: 75, stock: 100 }]
    },
    {
        name: "Rice Podi Mix",
        categoryName: "Rice Mixes",
        price: 85,
        stock: 100,
        weight: "100g",
        description: "A homestyle rice podi mix.",
        ingredients: "Toor Daal, Bengal Gram...",
        howToUse: "Mix with hot rice and ghee.",
        storage: "Store in a cool, dry place.",
        highlights: ["Protein rich"],
        image: "/products/HomeStyleParuppu.PNG",
        images: ["/products/HomeStyleParuppu.PNG"],
        isActive: true,
        isNewArrival: false,
        isFeatured: false,
        variants: [{ weight: "100g", price: 85, stock: 100 }]
    },
    {
        name: "Curry Leaves Rice Podi Mix",
        categoryName: "Rice Mixes",
        price: 85,
        stock: 100,
        weight: "100g",
        description: "A flavourful curry leaf rice mix.",
        ingredients: "Toor Dhal, Curry Leaves...",
        howToUse: "Mix with hot rice.",
        storage: "Store in a cool, dry place.",
        highlights: ["Curry leaf rich"],
        image: "/products/KaruveppillaiSpecial.PNG",
        images: ["/products/KaruveppillaiSpecial.PNG"],
        isActive: true,
        isNewArrival: false,
        isFeatured: false,
        variants: [{ weight: "100g", price: 85, stock: 100 }]
    },
    {
        name: "Coriander Rice Podi Mix",
        categoryName: "Rice Mixes",
        price: 85,
        stock: 100,
        weight: "100g",
        description: "A fragrant coriander rice mix.",
        ingredients: "Dhaniya, Urad Dhal...",
        howToUse: "Mix with hot rice.",
        storage: "Store in a cool, dry place.",
        highlights: ["Rich coriander aroma"],
        image: "/products/KothamalliAroma.PNG",
        images: ["/products/KothamalliAroma.PNG"],
        isActive: true,
        isNewArrival: false,
        isFeatured: false,
        variants: [{ weight: "100g", price: 85, stock: 100 }]
    },
    {
        name: "Moringa Rice Podi Mix",
        categoryName: "Rice Mixes",
        price: 85,
        stock: 100,
        weight: "100g",
        description: "A nutritious moringa leaf rice mix.",
        ingredients: "Murungai Keerai...",
        howToUse: "Mix with hot rice.",
        storage: "Store in a cool, dry place.",
        highlights: ["Moringa rich"],
        image: "/products/MurungaiVital.PNG",
        images: ["/products/MurungaiVital.PNG"],
        isActive: true,
        isNewArrival: false,
        isFeatured: false,
        variants: [{ weight: "100g", price: 85, stock: 100 }]
    },
    {
        name: "Pirandai Rice Podi Mix",
        categoryName: "Rice Mixes",
        price: 85,
        stock: 100,
        weight: "100g",
        description: "A traditional pirandai rice mix.",
        ingredients: "Pirandai, Tamarind...",
        howToUse: "Mix with hot rice.",
        storage: "Store in a cool, dry place.",
        highlights: ["Traditional herbal"],
        image: "/products/PirandaiPower.PNG",
        images: ["/products/PirandaiPower.PNG"],
        isActive: true,
        isNewArrival: false,
        isFeatured: false,
        variants: [{ weight: "100g", price: 85, stock: 100 }]
    },
    {
        name: "Ragi Choco Malt",
        categoryName: "Health drink mix",
        price: 250,
        stock: 100,
        weight: "250g",
        description: "A nutritious millet-based chocolate health drink.",
        ingredients: "Ragi, Cocoa Powder, Saffron, Almonds...",
        howToUse: "Mix with milk or water and cook.",
        storage: "Store in a cool, dry place.",
        highlights: ["No preservatives", "Calcium rich"],
        image: "/products/RagiChocoMalt.PNG",
        images: ["/products/RagiChocoMalt.PNG"],
        isActive: true,
        isNewArrival: true,
        isFeatured: true,
        variants: [{ weight: "250g", price: 250, stock: 100 }]
    },
    {
        name: "Nutriminix – Multi Grain Health Mix",
        categoryName: "Health drink mix",
        price: 200,
        stock: 100,
        weight: "250g",
        image: "/products/NutriMix.PNG",
        images: ["/products/NutriMix.PNG"],
        isActive: true,
        isNewArrival: false,
        isFeatured: true,
        variants: [{ weight: "250g", price: 200, stock: 100 }]
    }
];

async function seedProducts() {
    try {
        if (!process.env.MONGODB_URI) { console.error('❌ MONGODB_URI not found'); process.exit(1); }
        await mongoose.connect(process.env.MONGODB_URI);
        const { Product } = require('../models/Product');
        const Category = require('../models/Category');

        for (const item of products) {
            const category = await Category.findOne({ name: item.categoryName });
            if (!category) { console.warn(`⚠️ Category not found for ${item.name}: ${item.categoryName}`); continue; }
            const productData = { ...item, category: category._id };
            productData.slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            delete productData.categoryName;
            await Product.findOneAndUpdate({ name: item.name }, productData, { upsert: true, new: true });
            console.log(`   ✓ Processed: ${item.name}`);
        }
        console.log('✅ Seeding complete.');
    } catch (error) { console.error('❌ Error:', error); }
    finally { await mongoose.disconnect(); process.exit(0); }
}
seedProducts();
