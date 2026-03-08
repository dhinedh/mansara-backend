const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const MONGODB_URI = process.env.MONGODB_URI;

const productSchema = new mongoose.Schema({
    price: Number,
    offerPrice: Number,
    isOffer: Boolean,
    variants: Array,
    slug: String
}, { collection: 'products', strict: false });

const Product = mongoose.model('Product', productSchema);

const frontendProducts = [
    { id: "69a83fe51c2c00db0a9ba527", slug: "urad-porridge-mix-classic", price: 66, offerPrice: 53, isOffer: true, variants: [{ weight: "100g", price: 66, offerPrice: 53 }, { weight: "250g", price: 168, offerPrice: 134 }] },
    { id: "69a83fe61c2c00db0a9ba528", slug: "urad-porridge-mix-salt-pepper", price: 66, offerPrice: 53, isOffer: true, variants: [{ weight: "100g", price: 66, offerPrice: 53 }, { weight: "250g", price: 168, offerPrice: 134 }] },
    { id: "69a83fe61c2c00db0a9ba529", slug: "urad-porridge-mix-millet-magic", price: 72, offerPrice: 58, isOffer: true, variants: [{ weight: "100g", price: 72, offerPrice: 58 }, { weight: "250g", price: 180, offerPrice: 144 }] },
    { id: "69a83fe61c2c00db0a9ba52a", slug: "urad-porridge-mix-premium", price: 78, offerPrice: 62, isOffer: true, variants: [{ weight: "100g", price: 78, offerPrice: 62 }, { weight: "250g", price: 192, offerPrice: 154 }] },
    { id: "69a83fe61c2c00db0a9ba52b", slug: "black-rice-delight-porridge-mix", price: 84, offerPrice: 67, isOffer: true, variants: [{ weight: "100g", price: 84, offerPrice: 67 }, { weight: "250g", price: 216, offerPrice: 173 }] },
    { id: "69a83fe71c2c00db0a9ba52c", slug: "millet-fusion-idly-podi", price: 90, offerPrice: 72, isOffer: true, variants: [{ weight: "100g", price: 90, offerPrice: 72 }] },
    { id: "69a83fe71c2c00db0a9ba52d", slug: "ragi-choco-malt", price: 300, offerPrice: 240, isOffer: true, variants: [{ weight: "250g", price: 300, offerPrice: 240 }] },
    { id: "69a8face2fef7ae403186838", slug: "ultimate-wellness-combo-5-mixes", price: 312, offerPrice: 250, isOffer: true },
    { id: "prod-nutrimix", slug: "nutrimix-super-health-mix", price: 240, offerPrice: 192, isOffer: true, variants: [{ weight: "250g", price: 240, offerPrice: 192 }] },
    { id: "prod-traditional-idly-podi", slug: "traditional-idly-podi", price: 90, offerPrice: 72, isOffer: true, variants: [{ weight: "100g", price: 90, offerPrice: 72 }] },
    { id: "prod-home-style-paruppu-podi", slug: "home-style-paruppu-podi", price: 102, offerPrice: 82, isOffer: true, variants: [{ weight: "100g", price: 102, offerPrice: 82 }] },
    { id: "prod-karuveppillai-special", slug: "karuveppillai-special", price: 102, offerPrice: 82, isOffer: true, variants: [{ weight: "100g", price: 102, offerPrice: 82 }] },
    { id: "prod-kotha-malli-aroma", slug: "kotha-malli-aroma", price: 102, offerPrice: 82, isOffer: true, variants: [{ weight: "100g", price: 102, offerPrice: 82 }] },
    { id: "prod-murungai-vital", slug: "murungai-vital", price: 102, offerPrice: 82, isOffer: true, variants: [{ weight: "100g", price: 102, offerPrice: 82 }] },
    { id: "prod-pirandai-power", slug: "pirandai-power", price: 102, offerPrice: 82, isOffer: true, variants: [{ weight: "100g", price: 102, offerPrice: 82 }] }
];

async function sync() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const data of frontendProducts) {
            let product = null;

            // Try matching by ObjectId if valid
            if (/^[0-9a-fA-F]{24}$/.test(data.id)) {
                product = await Product.findOne({ _id: data.id });
            }

            // Fallback: Try matching by slug
            if (!product) {
                product = await Product.findOne({ slug: data.slug });
            }

            if (product) {
                product.price = data.price;
                product.offerPrice = data.offerPrice;
                product.isOffer = data.isOffer;
                if (data.variants) product.variants = data.variants;

                await product.save();
                console.log(`Updated [${data.slug}]: Price=${data.price}, OfferPrice=${data.offerPrice}`);
            } else {
                console.warn(`Could not find product with ID "${data.id}" or Slug "${data.slug}"`);
            }
        }
        console.log('Sync completed.');
    } catch (error) {
        console.error('Sync failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

sync();
