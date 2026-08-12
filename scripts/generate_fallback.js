const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');

const getEnrichedDescription = (slug, name, existingDesc, category) => {
  let desc = existingDesc || '';
  if (desc.length > 300) return desc;

  if (slug.includes('nutrimix')) {
    return `${desc} A traditional 27 ingredient multigrain health mix formulated according to authentic South Indian nutritional wisdom. Packed with sprouted millets, whole pulses, and premium nuts, this health mix for lactating mothers in Tamil Nadu and growing infants provides essential iron, bio-available calcium, and plant proteins. Prepared with zero preservatives, artificial colors, or chemical additives, it offers a complete, easy-to-digest daily breakfast for toddlers, active children, and adults.`.trim();
  }
  if (slug.includes('black-rice')) {
    return `${desc} Prepared from ancient Karuppu Kavuni (black rice), this high fiber porridge mix for weight loss and anti-inflammatory wellness is rich in natural anthocyanins, dietary iron, and essential antioxidants. A popular low GI breakfast option in India, it stabilizes blood sugar levels while nourishing digestive health for elders and fitness enthusiasts alike.`.trim();
  }
  if (slug.includes('urad') || slug.includes('porridge')) {
    return `${desc} A wholesome, traditional sprouted black gram (urad dal) porridge mix designed for daily nourishment, bone strength, and digestive vitality. Highly recommended as a traditional health mix for lactating mothers and elderly family members in Chennai, it is slow-roasted in small batches with zero added sugar or artificial flavorings.`.trim();
  }
  if (slug.includes('podi') || slug.includes('idly')) {
    return `${desc} An authentic, no preservative idly podi online favorite from Chennai, prepared with traditional slow-roasted lentils, sesame seeds, red chillies, and digestive herbs. Perfect as a flavorful gunpowder podi home delivery side dish for idlis, dosas, and warm rice tossed in pure ghee or gingelly oil.`.trim();
  }
  if (slug.includes('ragi') || slug.includes('choco')) {
    return `${desc} A delicious, no sugar health drink for kids combining organic finger millet (ragi) with natural cocoa and traditional spices. Packed with dietary calcium, plant protein, and iron, it serves as a nutrient-rich millet health mix for children and teenagers seeking healthy morning stamina.`.trim();
  }

  return `${desc} Authentic South Indian health mix product prepared in Chennai using traditional slow-roasting techniques with zero preservatives, artificial colors, or chemical additives for complete family wellness.`.trim();
};

async function generateFallback() {
  let products = [];
  const targetPath = path.join(__dirname, '../../mansara-nourish-hub/src/data/fallbackProducts.ts');

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const { Product } = require('../models/Product');
    const rawProducts = await Product.find({ isActive: true }).lean();
    
    products = rawProducts.map(p => {
      const enrichedDesc = getEnrichedDescription(p.slug, p.name, p.description, p.category);
      return {
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
        description: enrichedDesc,
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
      };
    });
    console.log(`✅ Successfully extracted and enriched ${products.length} products directly from MongoDB!`);
  } catch (dbErr) {
    console.error('❌ MongoDB extraction error:', dbErr.message);
  } finally {
    await mongoose.disconnect();
  }

  if (products.length === 0) {
    console.error('❌ Could not fetch product data.');
    process.exit(1);
  }

  const fileContent = `/**
 * FALLBACK FEATURED PRODUCTS DATA
 * Exact live JSON snapshot from API / MongoDB database with SEO-enriched long-tail descriptions.
 * Used as initial starting state for instant 0ms homepage rendering.
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
