const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
}

async function backupMongoData() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupDir = path.join(__dirname, '../backups', `backup_${timestamp}`);
    
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log(`🚀 Starting Full Backup to: ${backupDir}`);
    
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');

        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        
        for (const col of collections) {
            console.log(`📦 Backing up collection: ${col.name}...`);
            const data = await db.collection(col.name).find({}).toArray();
            
            const filePath = path.join(backupDir, `${col.name}.json`);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`✅ Saved ${data.length} records to ${col.name}.json`);
        }

        console.log('\n🏁 FULL BACKUP COMPLETE! Your data is now safe in local files.');
        console.log(`📍 Location: ${backupDir}`);

    } catch (err) {
        console.error('❌ Backup Failed:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

backupMongoData();
