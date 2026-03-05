require('dotenv').config();
const mongoose = require('mongoose');

async function listCombos() {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('❌ MONGODB_URI not found');
            process.exit(1);
        }
        await mongoose.connect(process.env.MONGODB_URI);
        const { Combo } = require('./models/Product');
        const combos = await Combo.find({}).lean();
        console.log(JSON.stringify(combos, null, 2));
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

listCombos();
