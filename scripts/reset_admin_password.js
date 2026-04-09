const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = 'admin@mansarafoods.com';
const NEW_PASSWORD = 'Mansara@2026';

if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined in .env');
    process.exit(1);
}

async function resetPassword() {
    console.log(`🔐 Attempting to reset password for: ${ADMIN_EMAIL}...`);
    
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB Atlas');

        // 1. Find the User
        const db = mongoose.connection.db;
        const user = await db.collection('users').findOne({ email: ADMIN_EMAIL });

        if (!user) {
            console.error(`❌ User with email ${ADMIN_EMAIL} not found!`);
            process.exit(1);
        }

        // 2. Hash the new password
        console.log('⏳ Hashing new password...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(NEW_PASSWORD, salt);

        // 3. Update the password in DB
        const result = await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { password: hashedPassword, updatedAt: new Date() } }
        );

        if (result.modifiedCount === 1) {
            console.log('\n--- 🎉 PASSWORD RESET SUCCESSFUL ---');
            console.log(`📧 Email: ${ADMIN_EMAIL}`);
            console.log(`🔑 New Password: ${NEW_PASSWORD}`);
            console.log('------------------------------------\n');
            console.log('⚠️ Please change this password after logging in for safety.');
        } else {
            console.log('❌ Failed to update password (maybe it was already the same?).');
        }

    } catch (err) {
        console.error('❌ Reset Failed:', err);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

resetPassword();
