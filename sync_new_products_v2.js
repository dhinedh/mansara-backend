const mongoose = require('mongoose');
require('dotenv').config();

const productsData = [
    {
        name: "NutriMix Super Health Mix",
        slug: "nutrimix-super-health-mix",
        category: "69a83fe41c2c00db0a9ba526",
        price: 200,
        offerPrice: 200,
        originalPrice: 200,
        stock: 100,
        weight: "250g",
        image: "/products/NutriMix.PNG",
        images: ["/products/NutriMix.PNG", "/products/NutriMix_Label.PNG"],
        description: "A traditional 27-ingredient multi-grain health mix designed for complete family nutrition and strength.",
        highlights: ["No preservatives", "27 wholesome ingredients", "High protein & high fibre", "Suitable for 8+ months to elderly"],
        ingredients: "Ragi, Kollu, Green Gram, Badam, Barley, Red Rice, Samba Wheat, Cashew, Kambu, Kaikuthal Rice, Kavuni Rice, Javvarisi, Yellow Cholam, White Cholam, Rajma, Black Gram, Groundnut, Moongil Arisi, Kaatu Yaanai Rice, Mappillai Samba, Fried Gram (Udacha Kadalai), Thinai, Saamai, Guthirai Vaali, Varagu, Dry Ginger, Cardamom",
        tasteProfile: "Mild, nutty, traditional",
        suitableFor: "Kids (8+ months), adults, elderly",
        howToUse: "Mix 2 tbsp with water, cook on low flame with stirring till thick. Add milk/salt/jaggery as preferred. Serve warm.",
        storage: "Store in a cool, dry place. Keep airtight after opening.",
        shelfLife: "6 months",
        packagingType: "PET Jar",
        certifications: ["FSSAI"],
        isFeatured: true,
        isNewArrival: false,
        isOffer: false,
        isActive: true,
        variants: [{ weight: "250g", price: 200, offerPrice: 200, stock: 100 }]
    },
    {
        name: "Traditional Idly Podi",
        slug: "traditional-idly-podi",
        category: "69a83fe41c2c00db0a9ba528",
        price: 80,
        offerPrice: 80,
        originalPrice: 80,
        stock: 100,
        weight: "100g",
        image: "/products/TraditionalIdlyPodi.PNG",
        images: ["/products/TraditionalIdlyPodi.PNG", "/products/TraditionalIdlyPodiLabel.PNG"],
        description: "A classic South Indian idly podi made from roasted lentils and spices, crafted to enhance the taste of idly and dosa.",
        highlights: ["No preservatives", "Authentic roast & grind", "Homemade taste", "Suitable for all age groups"],
        ingredients: "Black Gram (கருப்பு உளுந்து), Bengal Gram (கடலைப்பருப்பு), Green Gram (பாசிப்பருப்பு), Fried Gram (வருத்தக்கடலை), Dry Red Chilli (காய்ந்த மிளகாய்), Kashmiri Chilli (காஷ்மீரி மிளகாய்), Toor Dal (துவரம் பருப்பு), Salt (உப்பு), Black Pepper (மிளகு), Asafoetida (பெருங்காயம்)",
        tasteProfile: "Spicy, traditional",
        suitableFor: "All age groups",
        howToUse: "Mix required quantity with gingelly oil or ghee. Best served with idly, dosa, uthappam, or chapati.",
        storage: "Store in a cool, dry place. Keep airtight after opening.",
        shelfLife: "6 months",
        packagingType: "PET Jar",
        certifications: ["FSSAI"],
        isFeatured: false,
        isNewArrival: false,
        isOffer: false,
        isActive: true,
        variants: [{ weight: "100g", price: 80, offerPrice: 80, stock: 100 }]
    },
    {
        name: "Millet Fusion Idly Podi",
        slug: "millet-fusion-idly-podi",
        category: "69a83fe41c2c00db0a9ba528",
        price: 90,
        offerPrice: 90,
        originalPrice: 90,
        stock: 100,
        weight: "100g",
        image: "/products/MilletFusionIdlyPodi.PNG",
        images: ["/products/MilletFusionIdlyPodi.PNG", "/products/MilletFusionIdlyPodiLabel.PNG"],
        description: "A nutritious millet-enriched idly podi combining lentils, millets, and spices for a healthy traditional side dish.",
        highlights: ["No preservatives", "Millet enriched formula", "Traditional roast & grind", "Suitable for all age groups"],
        ingredients: "Black Gram (கருப்பு உளுந்து), Bengal Gram (கடலைப்பருப்பு), Green Gram (பாசிப்பருப்பு), Fried Gram (வருத்தக்கடலை), Foxtail Millet (தினை), Little Millet (சாமை), Barnyard Millet (குதிரைவாலி), Kodo Millet (வரகு), Dry Red Chilli (காய்ந்த மிளகாய்), Kashmiri Chilli (காஷ்மீரி மிளகாய்), Toor Dal (துவரம் பருப்பு), Salt (உப்பு), Black Pepper (மிளகு), Asafoetida (பெருங்காயம்)",
        tasteProfile: "Spicy, nutty",
        suitableFor: "All age groups",
        howToUse: "Mix with gingelly oil or ghee and serve with idly, dosa, chapati, or poori.",
        storage: "Store in a cool, dry place. Keep airtight after opening.",
        shelfLife: "6 months",
        packagingType: "PET Jar",
        certifications: ["FSSAI"],
        isFeatured: false,
        isNewArrival: false,
        isOffer: false,
        isActive: true,
        variants: [{ weight: "100g", price: 90, offerPrice: 90, stock: 100 }]
    },
    {
        name: "Home Style Paruppu Podi",
        slug: "home-style-paruppu-podi",
        category: "69a83fe41c2c00db0a9ba529",
        price: 80,
        offerPrice: 80,
        originalPrice: 80,
        stock: 100,
        weight: "100g",
        image: "/products/HomeStyleParuppu.PNG",
        images: ["/products/HomeStyleParuppu.PNG", "/products/HomeStyleParuppuLabel.PNG"],
        description: "A homestyle protein-rich paruppu podi made from roasted dals and spices, perfect for mixing with hot rice and ghee.",
        highlights: ["No preservatives", "Protein rich formula", "Traditional recipe", "Suitable for all age groups"],
        ingredients: "Toor Daal, Bengal Gram, Green Gram, Fried Gram (Udacha Kadalai), Cumin Seeds, Salt, Pepper, Dry Chilli, Kashmiri Chilli, Asafoetida",
        tasteProfile: "Spicy, dal-forward",
        suitableFor: "All age groups",
        howToUse: "Mix 1–2 tsp with hot rice and ghee or gingelly oil. Also pairs with idly and dosa.",
        storage: "Store in a cool, dry place. Keep airtight after opening.",
        shelfLife: "6 months",
        packagingType: "PET Jar",
        certifications: ["FSSAI"],
        isFeatured: false,
        isNewArrival: false,
        isOffer: false,
        isActive: true,
        variants: [{ weight: "100g", price: 80, offerPrice: 80, stock: 100 }]
    },
    {
        name: "Karuveppillai Special",
        slug: "karuveppillai-special",
        category: "69a83fe41c2c00db0a9ba529",
        price: 80,
        offerPrice: 80,
        originalPrice: 80,
        stock: 100,
        weight: "100g",
        image: "/products/KaruveppillaiSpecial.PNG",
        images: ["/products/KaruveppillaiSpecial.PNG", "/products/KaruveppillaiSpecialLabel.PNG"],
        description: "A flavourful curry leaf rice mix blended with lentils and spices for a fragrant traditional meal.",
        highlights: ["No preservatives", "Curry leaf rich blend", "Traditional roast & grind", "Suitable for all age groups"],
        ingredients: "Toor Dhal, Urad Dhal, Pepper, Jeera, Salt, Hing, Curry Leaves, Red Chilli, Tamarind",
        tasteProfile: "Spicy, aromatic",
        suitableFor: "All age groups",
        howToUse: "Mix with hot rice and ghee or gingelly oil. Serve warm.",
        storage: "Store in a cool, dry place. Keep airtight after opening.",
        shelfLife: "6 months",
        packagingType: "PET Jar",
        certifications: ["FSSAI"],
        isFeatured: false,
        isNewArrival: false,
        isOffer: false,
        isActive: true,
        variants: [{ weight: "100g", price: 80, offerPrice: 80, stock: 100 }]
    },
    {
        name: "Kotha Malli Aroma",
        slug: "kotha-malli-aroma",
        category: "69a83fe41c2c00db0a9ba529",
        price: 80,
        offerPrice: 80,
        originalPrice: 80,
        stock: 100,
        weight: "100g",
        image: "/products/KothamalliAroma.PNG",
        images: ["/products/KothamalliAroma.PNG", "/products/KothamalliAromaLabel.PNG"],
        description: "A fragrant coriander-based rice mix with roasted lentils and spices for quick, tasty meals.",
        highlights: ["No preservatives", "Rich coriander aroma", "Traditional roast & grind", "Suitable for all age groups"],
        ingredients: "Dhaniya (Coriander), Urad Dhal, Jeera, Red Chilli, Salt, Asafoetida",
        tasteProfile: "Spicy, coriander-rich",
        suitableFor: "All age groups",
        howToUse: "Mix with hot rice and ghee or gingelly oil. Serve warm.",
        storage: "Store in a cool, dry place. Keep airtight after opening.",
        shelfLife: "6 months",
        packagingType: "PET Jar",
        certifications: ["FSSAI"],
        isFeatured: false,
        isNewArrival: false,
        isOffer: false,
        isActive: true,
        variants: [{ weight: "100g", price: 80, offerPrice: 80, stock: 100 }]
    },
    {
        name: "Murungai Vital",
        slug: "murungai-vital",
        category: "69a83fe41c2c00db0a9ba529",
        price: 85,
        offerPrice: 85,
        originalPrice: 85,
        stock: 100,
        weight: "100g",
        image: "/products/MurungaiVital.PNG",
        images: ["/products/MurungaiVital.PNG", "/products/MurungaiVitalLabel.PNG"],
        description: "A nutritious moringa leaf rice mix blended with lentils and spices for daily wellness.",
        highlights: ["No preservatives", "Moringa (Drumstick leaf) rich", "Traditional roast & grind", "Suitable for all age groups"],
        ingredients: "Murungai Keerai (Moringa Leaves), Gram Dhal, Urad Dhal, Tamarind, Salt, Asafoetida",
        tasteProfile: "Spicy, herbal",
        suitableFor: "All age groups",
        howToUse: "Mix with hot rice and ghee or gingelly oil. Serve warm.",
        storage: "Store in a cool, dry place. Keep airtight after opening.",
        shelfLife: "6 months",
        packagingType: "PET Jar",
        certifications: ["FSSAI"],
        isFeatured: false,
        isNewArrival: false,
        isOffer: false,
        isActive: true,
        variants: [{ weight: "100g", price: 85, offerPrice: 85, stock: 100 }]
    },
    {
        name: "Pirandai Power",
        slug: "pirandai-power",
        category: "69a83fe41c2c00db0a9ba529",
        price: 85,
        offerPrice: 85,
        originalPrice: 85,
        stock: 100,
        weight: "100g",
        image: "/products/PirandaiPower.PNG",
        images: ["/products/PirandaiPower.PNG", "/products/PirandaiPowerLabel.PNG"],
        description: "A traditional pirandai-based rice mix known for its distinctive taste and digestive benefits.",
        highlights: ["No preservatives", "Traditional herbal recipe", "Authentic roast & grind", "Suitable for all age groups"],
        ingredients: "Pirandai (Adamant Creeper), Tamarind, Gram Dhal, Urad Dhal, Jeera, Pepper, Salt, Asafoetida",
        tasteProfile: "Spicy, tangy",
        suitableFor: "All age groups",
        howToUse: "Mix with hot rice and ghee or gingelly oil. Serve warm.",
        storage: "Store in a cool, dry place. Keep airtight after opening.",
        shelfLife: "6 months",
        packagingType: "PET Jar",
        certifications: ["FSSAI"],
        isFeatured: false,
        isNewArrival: false,
        isOffer: false,
        isActive: true,
        variants: [{ weight: "100g", price: 85, offerPrice: 85, stock: 100 }]
    }
];

async function syncAllV2() {
    const dbNames = ['test', 'mansara-db'];
    const baseUri = 'mongodb+srv://joypackers60_db_user:EYp8MTlbyeyX7X35@cluster0.rhqubga.mongodb.net/';

    for (const dbName of dbNames) {
        try {
            console.log(`\n>>> Syncing Database: ${dbName}`);
            const uri = `${baseUri}${dbName}?retryWrites=true&w=majority`;
            await mongoose.connect(uri);

            const productsCol = mongoose.connection.db.collection('products');

            for (const p of productsData) {
                console.log(`  Syncing product with full details: ${p.name}`);
                const updateData = {
                    ...p,
                    category: new mongoose.Types.ObjectId(p.category),
                    updatedAt: new Date()
                };

                await productsCol.updateOne(
                    { slug: p.slug },
                    { $set: updateData },
                    { upsert: true }
                );
            }

            console.log(`  Sync complete for ${dbName}`);
            await mongoose.disconnect();
        } catch (error) {
            console.error(`  Error syncing ${dbName}:`, error.message);
        }
    }
}

syncAllV2();
