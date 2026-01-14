const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const { Product, Combo } = require('./models/Product');
const Category = require('./models/Category');

const createCombo = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // 1. Get/Create Combos Category
        let comboCategory = await Category.findOne({ name: 'Combos' });
        if (!comboCategory) {
            console.log('Creating Combos category...');
            comboCategory = await Category.create({
                name: 'Combos',
                slug: 'combos',
                description: 'Value packs and combos',
                isActive: true
            });
        }
        console.log('Category ID:', comboCategory._id);

        // 2. Find Products to Include
        // Exclude "Millet Fusion Idly Podi" and any existing 'Combo' types
        const inputs = await Product.find({
            isActive: true,
            name: { $ne: 'Millet Fusion Idly Podi' },
            // Only base products (where __t is not 'Combo')
            __t: { $ne: 'Combo' }
        });

        console.log(`Found ${inputs.length} products to include in the combo:`);
        inputs.forEach(p => console.log(` - ${p.name}`));

        if (inputs.length === 0) {
            console.error('No products found! Aborting.');
            process.exit(1);
        }

        // 3. Create/Update the Combo Product
        const comboData = {
            name: 'Ultimate Wellness Combo (5 Mixes)',
            slug: 'ultimate-wellness-combo-5-mixes',
            description: 'Experience the complete range of Mansara Foods premium porridge mixes. This pack contains all 5 of our signature blends- Urad Porridge Mix (Classic, Premium, Salt & Pepper, Millet Magic) and Black Rice Delight.',
            short_description: 'All 5 Premium Porridge Mixes (Excludes Idly Podi)',
            price: 260, // Special Price
            originalPrice: 275, // Original Price
            image: '/product-combo-5mixes.jpg', // Ensure this matches moved file
            category: comboCategory._id,
            products: inputs.map(p => p._id),
            comboPrice: 260,
            stock: 50, // Initial stock
            isActive: true,
            isFeatured: true,
            isOffer: true,
            offerText: 'SAVE ₹15',
            attributes: [],
            specifications: []
        };

        // Check if already exists to avoid duplicates
        let combo = await Combo.findOne({ slug: comboData.slug });

        if (combo) {
            console.log('Updating existing combo...');
            Object.assign(combo, comboData);
            await combo.save();
        } else {
            console.log('Creating new combo...');
            combo = await Combo.create(comboData);
        }

        console.log(`Successfully created/updated combo: ${combo.name}`);
        console.log(`ID: ${combo._id}`);

        process.exit(0);

    } catch (error) {
        console.error('Error creating combo:', error);
        process.exit(1);
    }
};

createCombo();
