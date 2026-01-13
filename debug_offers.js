const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Product } = require('./models/Product');

dotenv.config({ path: './.env' });

const debugOffers = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const offers = await Product.find({ name: { $regex: 'Porridge', $options: 'i' } }).limit(10).lean();

        console.log(`Found ${offers.length} offers`);

        offers.forEach(p => {
            console.log('------------------------------------------------');
            console.log(`Name: ${p.name}`);
            console.log(`ID: ${p._id}`);
            console.log(`Price: ${p.price}`);
            console.log(`OfferPrice: ${p.offerPrice}`);
            console.log(`Has Variants: ${p.variants?.length > 0}`);

            if (p.variants?.length > 0) {
                p.variants.forEach((v, i) => {
                    console.log(`  Variant ${i}: Weight=${v.weight}, Price=${v.price}, OfferPrice=${v.offerPrice}`);
                });
            }
        });

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

debugOffers();
