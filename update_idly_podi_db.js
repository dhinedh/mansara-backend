const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected!');

    const collection = mongoose.connection.db.collection('products');
    const idlyProducts = await collection.find({ slug: /idly-podi/ }).toArray();
    console.log('Found idly products:', idlyProducts.map(p => ({ slug: p.slug, image: p.image, images: p.images })));

    // Update Millet Fusion
    const resMillet = await collection.updateOne(
      { slug: 'millet-fusion-idly-podi' },
      {
        $set: {
          image: '/products/millet-idly-podi-front.jpg',
          images: [
            '/products/millet-idly-podi-front.jpg',
            '/products/millet-idly-podi-back.jpg'
          ]
        }
      }
    );
    console.log('Millet Fusion updated:', resMillet.modifiedCount);

    // Update Traditional
    const resTrad = await collection.updateOne(
      { slug: 'traditional-idly-podi' },
      {
        $set: {
          image: '/products/traditional-idly-podi-front.jpg',
          images: [
            '/products/traditional-idly-podi-front.jpg',
            '/products/traditional-idly-podi-back.jpg'
          ]
        }
      }
    );
    console.log('Traditional updated:', resTrad.modifiedCount);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
