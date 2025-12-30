const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');

const verifyAllUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Optional: Specifically verify only the admin if desired, or all users for dev convenience
        // const result = await User.updateMany({}, { isVerified: true, otp: undefined, otpExpire: undefined });

        // Let's verify specifically the demo accounts first to be safe, or just all since it's dev.
        // Given it's a dev environment, let's verify ALL to unblock the user immediately.
        const result = await User.updateMany(
            { $or: [{ isVerified: false }, { isVerified: { $exists: false } }] },
            { $set: { isVerified: true }, $unset: { otp: "", otpExpire: "" } }
        );

        console.log(`Updated ${result.modifiedCount} users to verified status.`);
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

verifyAllUsers();
