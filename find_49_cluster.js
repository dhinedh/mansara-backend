const mongoose = require('mongoose');
require('dotenv').config();

async function findValue49() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admin = mongoose.connection.db.admin();
        const dbList = await admin.listDatabases();

        for (const dbInfo of dbList.databases) {
            const dbName = dbInfo.name;
            if (['admin', 'local', 'config'].includes(dbName)) continue;

            console.log(`Checking DB: ${dbName}`);
            const db = mongoose.connection.useDb(dbName);
            const collections = await db.db.listCollections().toArray();

            for (const colInfo of collections) {
                const colName = colInfo.name;
                console.log(`  Searching collection: ${colName}`);
                const count = await db.collection(colName).countDocuments({
                    $or: [
                        { price: 49 },
                        { offerPrice: 49 },
                        { "variants.price": 49 },
                        { "variants.offerPrice": 49 }
                    ]
                });

                if (count > 0) {
                    console.log(`  >>> FOUND ${count} documents with price 49 in ${dbName}.${colName}!`);
                }
            }
        }

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

findValue49();
