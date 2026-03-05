const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabases() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const admin = mongoose.connection.db.admin();
        const dbList = await admin.listDatabases();
        console.log('Databases in Cluster:');
        dbList.databases.forEach(db => console.log(`- ${db.name}`));

        console.log('\nCurrent Database:', mongoose.connection.db.databaseName);

        await mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkDatabases();
