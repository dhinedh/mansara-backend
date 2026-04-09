const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

async function consolidatedBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `mansara_full_backup_${timestamp}.json`;
    const filePath = path.join(__dirname, '../backups', fileName);

    console.log(`🚀 Creating Consolidated Backup: ${fileName}`);
    
    try {
        await mongoose.connect(MONGODB_URI);
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        
        const fullBackup = {};

        for (const col of collections) {
            console.log(`📦 Exporting ${col.name}...`);
            const data = await db.collection(col.name).find({}).toArray();
            fullBackup[col.name] = data;
        }

        fs.writeFileSync(filePath, JSON.stringify(fullBackup, null, 2));
        console.log(`✅ Success! Full backup saved to: ${filePath}`);

    } catch (err) {
        console.error('❌ Backup Failed:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

consolidatedBackup();
