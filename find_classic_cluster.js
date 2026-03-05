const mongoose = require('mongoose');
require('dotenv').config();

async function findProductClassic() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admin = mongoose.connection.db.admin();
        const dbList = await admin.listDatabases();

        for (const dbInfo of dbList.databases) {
            const dbName = dbInfo.name;
            if (['admin', 'local', 'config'].includes(dbName)) continue;

            const db = mongoose.connection.useDb(dbName);
            const collections = await db.db.listCollections().toArray();

            for (const colInfo of collections) {
                const colName = colInfo.name;
                const docs = await db.collection(colName).find({
                    name: { $regex: /Classic/i }
                }).toArray();

                if (docs.length > 0) {
                    console.log(`FOUND in ${dbName}.${colName}:`);
                    docs.forEach(d => {
                        console.log(`- ${d.name} (${d.slug}): Price=${d.price}, OfferPrice=${d.offerPrice}, OriginalPrice=${d.originalPrice}`);
                        console.log(`  Data: ${JSON.stringify(d)}`);
                    });
                }
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

findProductClassic();
