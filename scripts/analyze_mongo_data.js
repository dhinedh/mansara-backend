const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
}

async function analyzeMongoData() {
    console.log('🔍 Starting MongoDB Data Analysis...');
    
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        
        const analysis = [];

        for (const col of collections) {
            const count = await db.collection(col.name).countDocuments();
            const sample = await db.collection(col.name).findOne({});
            
            // Analyze schema complexity
            const fields = sample ? Object.keys(sample) : [];
            const hasNestedArrays = sample ? Object.values(sample).some(val => Array.isArray(val)) : false;
            const hasNestedObjects = sample ? Object.values(sample).some(val => typeof val === 'object' && val !== null && !Array.isArray(val) && !(val instanceof mongoose.Types.ObjectId) && !(val instanceof Date)) : false;

            analysis.push({
                collection: col.name,
                count,
                fields: fields.filter(f => !f.startsWith('__')),
                complexity: {
                    nestedArrays: hasNestedArrays,
                    nestedObjects: hasNestedObjects
                }
            });
        }

        console.log('\n--- DATA SUMMARY ---');
        console.table(analysis.map(a => ({
            Collection: a.collection,
            Count: a.count,
            Fields: a.fields.length,
            Nested: a.complexity.nestedArrays || a.complexity.nestedObjects ? 'YES' : 'NO'
        })));
        
        console.log('\n--- SCHEMA DETAILS ---');
        analysis.forEach(a => {
            console.log(`\n[${a.collection.toUpperCase()}]`);
            console.log(`Fields: ${a.fields.join(', ')}`);
            if (a.complexity.nestedArrays) console.log(`⚠️  Contains ARRAYS (Requires separate tables or JSONB in Supabase)`);
            if (a.complexity.nestedObjects) console.log(`⚠️  Contains NESTED OBJECTS (Requires normalization in Supabase)`);
        });

    } catch (err) {
        console.error('❌ Analysis Failed:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

analyzeMongoData();
