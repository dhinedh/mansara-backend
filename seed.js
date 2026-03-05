const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Product } = require('./models/Product');
const Category = require('./models/Category');

dotenv.config();

const categories = [
    { name: 'Urad Porridge Mix', slug: 'urad-porridge-mix', description: 'Nutritious Urad Dal based health mixes', isActive: true, order: 1 },
    { name: 'Black Rice mix', slug: 'black-rice-mix', description: 'Premium Black Rice based health mixes', isActive: true, order: 2 },
    { name: 'Millet fusion mix', slug: 'millet-fusion-mix', description: 'Wholesome Millet fusion blends', isActive: true, order: 3 },
    { name: 'Health drink mix', slug: 'health-drink-mixes', description: 'Nutritious and delicious health drink blends', isActive: true, order: 4 },
    { name: 'Idly Podi', slug: 'idly-podi', description: 'Traditional and Millet enriched idly podis', isActive: true, order: 5 },
    { name: 'Rice Mixes', slug: 'rice-mixes', description: 'Authentic and nutritious rice mixes', isActive: true, order: 6 }
];

const products = [
    { name: "Urad Health Mix – Classic", category: "Urad Porridge Mix", price: 55, weight: "100g", image: "/products/urad-classic-front.jpg", stock: 50, isActive: true, isFeatured: true, variants: [{ weight: "100g", price: 55 }, { weight: "250g", price: 140 }] },
    { name: "Urad Health Mix – Salt n Pepper", category: "Urad Porridge Mix", price: 55, weight: "100g", image: "/products/urad-salt-pepper-front.jpg", stock: 50, isActive: true, variants: [{ weight: "100g", price: 55 }, { weight: "250g", price: 140 }] },
    { name: "Urad Health Mix – Millet Magic", category: "Urad Porridge Mix", price: 60, weight: "100g", image: "/products/urad-millet-magic-front.jpg", stock: 50, isActive: true, variants: [{ weight: "100g", price: 60 }, { weight: "250g", price: 150 }] },
    { name: "Urad Health Mix – Premium", category: "Urad Porridge Mix", price: 65, weight: "100g", image: "/products/urad-premium-front.jpg", stock: 50, isActive: true, variants: [{ weight: "100g", price: 65 }, { weight: "250g", price: 160 }] },
    { name: "Health Mix – Black Rice Delight", category: "Black Rice mix", price: 70, weight: "100g", image: "/products/black-rice-delight-front.jpg", stock: 50, isActive: true, variants: [{ weight: "100g", price: 70 }, { weight: "250g", price: 180 }] },
    { name: "Ragi Choco Malt", category: "Health drink mix", price: 250, weight: "250g", image: "/products/RagiChocoMalt.PNG", stock: 100, isActive: true, isNewArrival: true, isFeatured: true, variants: [{ weight: "250g", price: 250 }] },
    { name: "Nutriminix – Multi Grain Health Mix", category: "Health drink mix", price: 200, weight: "250g", image: "/products/NutriMix.PNG", stock: 100, isActive: true, isFeatured: true },
    { name: "Idly Podi – Traditional", category: "Idly Podi", price: 75, weight: "100g", image: "/products/TraditionalIdlyPodi.PNG", stock: 100, isActive: true },
    { name: "Idly Podi – Millet Fusion", category: "Idly Podi", price: 75, weight: "100g", image: "/products/MilletFusionIdlyPodi.PNG", stock: 100, isActive: true },
    { name: "Rice Podi Mix", category: "Rice Mixes", price: 85, weight: "100g", image: "/products/HomeStyleParuppu.PNG", stock: 100, isActive: true },
    { name: "Curry Leaves Rice Podi Mix", category: "Rice Mixes", price: 85, weight: "100g", image: "/products/KaruveppillaiSpecial.PNG", stock: 100, isActive: true },
    { name: "Coriander Rice Podi Mix", category: "Rice Mixes", price: 85, weight: "100g", image: "/products/KothamalliAroma.PNG", stock: 100, isActive: true },
    { name: "Moringa Rice Podi Mix", category: "Rice Mixes", price: 85, weight: "100g", image: "/products/MurungaiVital.PNG", stock: 100, isActive: true },
    { name: "Pirandai Rice Podi Mix", category: "Rice Mixes", price: 85, weight: "100g", image: "/products/PirandaiPower.PNG", stock: 100, isActive: true }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        const categoryMap = {};
        for (const cat of categories) {
            const savedCat = await Category.findOneAndUpdate({ name: cat.name }, cat, { upsert: true, new: true, setDefaultsOnInsert: true });
            categoryMap[cat.name] = savedCat._id;
        }
        for (const p of products) {
            const productData = { ...p, category: categoryMap[p.category], slug: p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') };
            await Product.findOneAndUpdate({ name: p.name }, productData, { upsert: true, new: true, setDefaultsOnInsert: true });
        }
        console.log('Seeding complete');
        process.exit(0);
    } catch (err) { console.error(err); process.exit(1); }
}
seed();
