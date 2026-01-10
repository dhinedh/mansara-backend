require('dotenv').config();
const mongoose = require('mongoose');

const categories = [
    {
        name: 'Urad Porridge Mix',
        value: 'urad-porridge-mix', // Explicit value/slug for consistency
        description: 'Nutritious Urad Dal based porridge mixes',
        isActive: true,
        order: 1
    },
    {
        name: 'Black Rice mix',
        value: 'black-rice-mix',
        description: 'Premium Black Rice based health mixes',
        isActive: true, // Ensuring it is active
        order: 2
    },
    {
        name: 'Millet fusion mix',
        value: 'millet-fusion-mix',
        description: 'Wholesome Millet fusion blends',
        isActive: true,
        order: 3
    }
];

async function seedCategories() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found in environment');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Import Category Model
        const Category = require('../models/Category');

        console.log('🌱 Seeding categories...');

        // Upsert categories (Update if exists, Insert if new)
        for (const cat of categories) {
            // Generate slug if not provided, but we provided 'value' which likely maps to slug in frontend, 
            // but backend schema has 'slug'.
            // Let's use the schema's pre-save logic or define slug explicitly.
            // Accessing schema logic: "categorySchema.pre('save'...)"
            // We'll let the model handle slug generation if we pass name, but it's safer to pass slug if we want specific URLs.

            const slug = cat.value;

            await Category.findOneAndUpdate(
                { name: cat.name },
                {
                    ...cat,
                    slug: slug
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            console.log(`   ✓ Processed: ${cat.name}`);
        }

        console.log(`✅ Successfully seeded ${categories.length} categories.`);

    } catch (error) {
        console.error('❌ Error seeding categories:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seedCategories();
