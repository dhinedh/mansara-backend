const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');

async function generateFallback() {
  let products = [];
  const targetPath = path.join(__dirname, '../../mansara-nourish-hub/src/data/fallbackProducts.ts');
  const API_URL = process.env.VITE_API_URL || process.env.BACKEND_URL || 'http://localhost:5000/api';

  // 1. Try fetching from live HTTP API first
  try {
    console.log(`[SYNC] Attempting to fetch live products from API: ${API_URL}/products`);
    const res = await fetch(`${API_URL}/products`);
    if (res.ok) {
      const data = await res.json();
      const raw = Array.isArray(data) ? data : (data.products || []);
      if (raw.length > 0) {
        products = raw.map(p => ({ ...p, id: p.id || p._id }));
        console.log(`✅ Successfully pulled ${products.length} live products directly from API!`);
      }
    }
  } catch (apiErr) {
    console.warn(`[SYNC] API fetch failed (${apiErr.message}), falling back to direct MongoDB extraction...`);
  }

  // 2. Fallback to direct MongoDB database connection if API wasn't reachable
  if (products.length === 0) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      const { Product } = require('../models/Product');
      const rawProducts = await Product.find({ isActive: true }).lean();
      
      products = rawProducts.map(p => ({
        id: p._id.toString(),
        _id: p._id.toString(),
        slug: p.slug,
        name: p.name,
        category: p.category,
        categoryId: p.categoryId ? p.categoryId.toString() : undefined,
        price: p.price,
        offerPrice: p.offerPrice,
        originalPrice: p.originalPrice || p.price,
        image: p.image,
        images: p.images && p.images.length > 0 ? p.images : [p.image],
        description: p.description || '',
        ingredients: p.ingredients || '',
        howToUse: p.howToUse || '',
        storage: p.storage || '',
        weight: p.weight || '100g',
        isOffer: !!p.isOffer,
        isNewArrival: !!p.isNewArrival,
        isFeatured: !!p.isFeatured,
        isActive: true,
        stock: p.stock ?? 100,
        highlights: p.highlights || [],
        nutrition: p.nutrition || '',
        compliance: p.compliance || '',
        sub_category: p.sub_category || '',
        short_description: p.short_description || '',
        rating: p.rating || 5,
        numReviews: p.numReviews || 0,
        variants: p.variants ? p.variants.map(v => ({
          weight: v.weight,
          price: v.price,
          offerPrice: v.offerPrice,
          originalPrice: v.originalPrice || v.price,
          stock: v.stock ?? 100,
          sku: v.sku
        })) : []
      }));
      console.log(`✅ Successfully extracted ${products.length} products directly from MongoDB!`);
    } catch (dbErr) {
      console.error('❌ MongoDB extraction error:', dbErr.message);
    } finally {
      await mongoose.disconnect();
    }
  }

  if (products.length === 0) {
    console.error('❌ Could not fetch product data from API or DB.');
    process.exit(1);
  }

  const fileContent = `/**
 * FALLBACK FEATURED PRODUCTS DATA
 * Exact live JSON snapshot from API / MongoDB database.
 * Used as initial starting state for instant 0ms homepage rendering
 * before live API fetch replaces it in background.
 * Updated: ${new Date().toISOString()}
 */
import { Product } from './products';

export const fallbackProducts: Product[] = ${JSON.stringify(products, null, 2)};
export default fallbackProducts;
`;

  fs.writeFileSync(targetPath, fileContent, 'utf-8');
  console.log('✅ Updated fallbackProducts.ts at:', targetPath);
}

generateFallback();
