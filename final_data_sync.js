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
    slug: String,
    isActive: Boolean,
    isFeatured: Boolean,
    isNewArrival: Boolean
}, { collection: 'products', strict: false });

const Product = mongoose.model('Product', productSchema);

const productsToSync = [
    {
        slug: "urad-porridge-mix-classic",
        price: 66,
        offerPrice: 53,
        isOffer: true,
        variants: [
            { weight: "100g", price: 66, offerPrice: 53 },
            { weight: "250g", price: 168, offerPrice: 134 }
        ],
        isFeatured: false,
        isActive: true
    },
    {
        slug: "urad-porridge-mix-salt-pepper",
        price: 66,
        offerPrice: 53,
        isOffer: true,
        variants: [
            { weight: "100g", price: 66, offerPrice: 53 },
            { weight: "250g", price: 168, offerPrice: 134 }
        ],
        isFeatured: false,
        isActive: true
    },
    {
        slug: "urad-porridge-mix-millet-magic",
        price: 72,
        offerPrice: 58,
        isOffer: true,
        variants: [
            { weight: "100g", price: 72, offerPrice: 58 },
            { weight: "250g", price: 180, offerPrice: 144 }
        ],
        isFeatured: false,
        isActive: true
    },
    {
        slug: "urad-porridge-mix-premium",
        price: 78,
        offerPrice: 62,
        isOffer: true,
        variants: [
            { weight: "100g", price: 78, offerPrice: 62 },
            { weight: "250g", price: 192, offerPrice: 154 }
        ],
        isFeatured: false,
        isActive: true
    },
    {
        slug: "black-rice-delight-porridge-mix",
        price: 84,
        offerPrice: 67,
        isOffer: true,
        variants: [
            { weight: "100g", price: 84, offerPrice: 67 },
            { weight: "250g", price: 216, offerPrice: 173 }
        ],
        isFeatured: false,
        isActive: true
    },
    {
        slug: "millet-fusion-idly-podi",
        price: 90,
        offerPrice: 72,
        isOffer: true,
        variants: [
            { weight: "100g", price: 90, offerPrice: 72 }
        ],
        isFeatured: false,
        isActive: true
    },
    {
        slug: "ragi-choco-malt",
        price: 300,
        offerPrice: 240,
        isOffer: true,
        variants: [
            { weight: "250g", price: 300, offerPrice: 240 }
        ],
        isFeatured: true,
        isNewArrival: true,
        isActive: true
    },
    {
        slug: "ultimate-wellness-combo-5-mixes",
        price: 312,
        offerPrice: 250,
        isOffer: true,
        isFeatured: true,
        isActive: true
    },
    {
        slug: "nutrimix-super-health-mix",
        price: 240,
        offerPrice: 192,
        isOffer: true,
        isFeatured: true,
        isActive: true,
        variants: [
            { weight: "250g", price: 240, offerPrice: 192 }
        ]
    },
    {
        slug: "traditional-idly-podi",
        price: 90,
        offerPrice: 72,
        isOffer: true,
        isFeatured: false,
        isActive: true,
        variants: [
            { weight: "100g", price: 90, offerPrice: 72 }
        ]
    },
    {
        slug: "home-style-paruppu-podi",
        price: 102,
        offerPrice: 82,
        isOffer: true,
        isFeatured: false,
        isActive: true,
        variants: [
            { weight: "100g", price: 102, offerPrice: 82 }
        ]
    },
    {
        slug: "karuveppillai-special",
        name: "Curry Leaves Rice Podi Mix",
        price: 102,
        offerPrice: 82,
        isOffer: true,
        isFeatured: false,
        isActive: true,
        variants: [
            { weight: "100g", price: 102, offerPrice: 82 }
        ]
    },
    {
        slug: "kotha-malli-aroma",
        price: 102,
        offerPrice: 82,
        isOffer: true,
        isFeatured: false,
        isActive: true,
        variants: [
            { weight: "100g", price: 102, offerPrice: 82 }
        ]
    },
    {
        slug: "murungai-vital",
        price: 102,
        offerPrice: 82,
        isOffer: true,
        isFeatured: false,
        isActive: true,
        variants: [
            { weight: "100g", price: 102, offerPrice: 82 }
        ]
    },
    {
        slug: "pirandai-power",
        price: 102,
        offerPrice: 82,
        isOffer: true,
        isFeatured: false,
        isActive: true,
        variants: [
            { weight: "100g", price: 102, offerPrice: 82 }
        ]
    }
];

async function sync() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const data of productsToSync) {
            const product = await Product.findOne({ slug: data.slug });

            if (product) {
                product.price = data.price;
                product.offerPrice = data.offerPrice;
                product.isOffer = data.isOffer;
                product.isFeatured = data.isFeatured;
                product.isActive = data.isActive;
                if (data.isNewArrival !== undefined) product.isNewArrival = data.isNewArrival;
                if (data.variants) product.variants = data.variants;

                await product.save();
                console.log(`Updated [${data.slug}]: Price=${data.price}, OfferPrice=${data.offerPrice}, isOffer=${data.isOffer}`);
            } else {
                console.warn(`Could not find product with Slug "${data.slug}"`);
            }
        }
        console.log('Final Sync completed.');
    } catch (error) {
        console.error('Final Sync failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

sync();
