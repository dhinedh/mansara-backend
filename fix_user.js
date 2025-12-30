const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mansara-db')
    .then(async () => {
        console.log('Connected to MongoDB');

        const users = await User.find({});
        console.log(`Found ${users.length} users.`);

        if (users.length > 0) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('Mansara@123', salt);

            for (const user of users) {
                user.isVerified = true;
                user.password = hashedPassword;
                await user.save();
                console.log(`Fixed user: ${user.email} (Role: ${user.role})`);
            }
            console.log('All users verified and passwords reset to: Mansara@123');
        } else {
            console.log('No users found.');
        }

        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
