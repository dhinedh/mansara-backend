const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Product } = require('../models/Product');
const whatsappService = require('../utils/WhatsAppService');

dotenv.config();

async function syncCatalog() {
    try {
        console.log('--- Botbiz Catalog Sync Started ---');

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const products = await Product.find({ isActive: true }).lean();
        console.log(`📦 Found ${products.length} active products`);

        const formattedProducts = products.map(p => ({
            id: p._id,
            name: p.name,
            description: p.description?.substring(0, 500),
            price: p.price,
            image_url: p.image,
            category: p.category // Note: This is an ID, might need population if Botbiz wants names
        }));

        const result = await whatsappService.syncCatalog(formattedProducts);
        console.log('✅ Sync request sent to Botbiz:', result);

    } catch (error) {
        console.error('❌ Sync failed:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('--- Sync Process Finished ---');
    }
}

syncCatalog();
