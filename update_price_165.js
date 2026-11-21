const dns = require('dns');
try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch (e) {}

const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB!');

    const collection = mongoose.connection.db.collection('products');
    
    // Find all products with originalPrice = 195 or mrp = 195
    const prods = await collection.find({ $or: [{ originalPrice: 195 }, { mrp: 195 }, { price: 195 }] }).toArray();
    console.log(`Found ${prods.length} products with price/mrp/originalPrice = 195:`);
    prods.forEach(p => console.log(`- ${p.name} (${p.slug}): price=${p.price}, originalPrice=${p.originalPrice}, mrp=${p.mrp}`));

    // Update all products where originalPrice is 195 to 165
    const updateRes = await collection.updateMany(
      { $or: [{ originalPrice: 195 }, { mrp: 195 }, { price: 195 }] },
      {
        $set: {
          originalPrice: 165,
          price: 165,
          offerPrice: null
        }
      }
    );
    console.log('Updated count in MongoDB:', updateRes.modifiedCount);

    // Verify all products in DB now
    const all = await collection.find({}).toArray();
    console.log('\n=== CURRENT CATALOG IN MONGODB ===');
    all.forEach(p => {
      console.log(`- ${p.name}: price=${p.price}, originalPrice=${p.originalPrice}, offerPrice=${p.offerPrice}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
