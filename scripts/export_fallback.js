const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 1. Load Environment
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const FRONTEND_DATA_PATH = path.join(__dirname, '../../mansara-nourish-hub/src/data/products.ts');

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
}

// 2. Load Models
// Note: We require them directly. Product.js exports both Product and Combo.
const { Product, Combo } = require('../models/Product');
const Category = require('../models/Category');

async function exportFallback() {
    console.log('🚀 Starting Fallback Export...');
    
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 3. Fetch Data
        console.log('📡 Fetching Categories...');
        const categories = await Category.find({}).lean();

        console.log('📡 Fetching Products...');
        const products = await Product.find({ isActive: true }).populate('category').lean();

        console.log('📡 Fetching Combos...');
        const combos = await Combo.find({ isActive: true }).lean();

        // 4. Transform Data to Frontend Format
        const transformedCategories = categories.map(c => ({
            id: c._id.toString(),
            _id: c._id.toString(),
            name: c.name,
            value: c.slug || c.name.toLowerCase().replace(/\s+/g, '-'),
            slug: c.slug || c.name.toLowerCase().replace(/\s+/g, '-')
        }));

        const transformedProducts = products.map(p => {
            // Helper to match frontend expectations
            const categorySlug = p.category?.slug || (typeof p.category === 'string' ? p.category : '');
            
            return {
                id: p._id.toString(),
                _id: p._id.toString(),
                slug: p.slug,
                name: p.name,
                category: categorySlug,
                categoryId: p.category?._id?.toString() || p.category?.toString(),
                price: p.price,
                offerPrice: p.offerPrice,
                originalPrice: p.originalPrice || p.price,
                image: p.image,
                images: p.images || [p.image],
                description: p.description,
                ingredients: p.ingredients || '',
                howToUse: p.howToUse || '',
                storage: p.storage || '',
                weight: p.weight || '',
                isOffer: p.isOffer || false,
                isNewArrival: p.isNewArrival || false,
                isFeatured: p.isFeatured || false,
                isActive: p.isActive !== false,
                stock: p.stock || 0,
                highlights: p.highlights || [],
                nutrition: p.nutrition || '',
                compliance: p.compliance || '',
                short_description: p.short_description || '',
                variants: (p.variants || []).map(v => ({
                    weight: v.weight,
                    price: v.price,
                    offerPrice: v.offerPrice,
                    stock: v.stock,
                    sku: v.sku
                }))
            };
        });

        const transformedCombos = combos.map(c => ({
            id: c._id.toString(),
            slug: c.slug,
            name: c.name,
            products: (c.products || []).map(pid => pid.toString()),
            originalPrice: c.originalPrice || (c.price * 1.2), // Fallback
            comboPrice: c.comboPrice || c.price,
            image: c.image,
            description: c.description
        }));

        // 5. Generate TypeScript File Content
        const fileContent = `/**
 * FALLBACK DATA - GENERATED AUTOMATICALLY
 * This file is used as the initial state for the frontend to ensure 0ms load times.
 * It is silently replaced by live data from the backend once the API responds.
 * Generated on: ${new Date().toLocaleString()}
 */

export interface Product {
  id: string;
  _id?: string;
  slug: string;
  name: string;
  category: string;
  categoryId?: string;
  price: number;
  offerPrice?: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  description: string;
  ingredients: string;
  howToUse: string;
  storage: string;
  weight: string;
  isOffer: boolean;
  isNewArrival: boolean;
  isFeatured: boolean;
  isActive?: boolean;
  stock?: number;
  highlights?: string[];
  nutrition?: string;
  compliance?: string;
  short_description?: string;
  variants?: {
    weight: string;
    price: number;
    offerPrice?: number;
    stock?: number;
    sku?: string;
  }[];
}

export interface Combo {
  id: string;
  slug: string;
  name: string;
  products: string[];
  originalPrice: number;
  comboPrice: number;
  image: string;
  description: string;
}

export interface Category {
  id: string;
  _id?: string;
  name: string;
  value: string;
  slug: string;
}

export const categories: Category[] = ${JSON.stringify(transformedCategories, null, 2)};

export const products: Product[] = ${JSON.stringify(transformedProducts, null, 2)};

export const combos: Combo[] = ${JSON.stringify(transformedCombos, null, 2)};

export const getProductById = (id: string): Product | undefined => {
  return products.find(p => p.id === id || p._id === id);
};

export const getProductBySlug = (slug: string): Product | undefined => {
  return products.find(p => p.slug === slug);
};

export const getFeaturedProducts = (): Product[] => {
  return products.filter(p => p.isFeatured);
};

export const getOfferProducts = (): Product[] => {
  return products.filter(p => p.isOffer);
};

export const getNewArrivals = (): Product[] => {
  return products.filter(p => p.slug === 'ragi-choco-malt');
};

export const getProductsByCategory = (category: string): Product[] => {
  return products.filter(p => p.category === category || p.categoryId === category);
};
`;

        // 6. Write to File
        fs.writeFileSync(FRONTEND_DATA_PATH, fileContent);
        console.log(`✅ Success! Fallback data written to: ${FRONTEND_DATA_PATH}`);

    } catch (err) {
        console.error('❌ Export Failed:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

exportFallback();
