const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./models/User');

const clearAllCarts = async () => {
    try {
        // Use MONGODB_URI instead of MONGO_URI
        const mongoUri = process.env.MONGODB_URI;
        
        if (!mongoUri) {
            console.error('✗ ERROR: MONGODB_URI not found in environment variables');
            process.exit(1);
        }

        console.log('Connecting to MongoDB...');
        await mongoose.connect(mongoUri, {
            serverSelectionTimeoutMS: 5000
        });
        console.log('✓ Connected to MongoDB');

        // Get initial stats
        const totalUsers = await User.countDocuments({});
        const usersWithCartsBefore = await User.countDocuments({ 
            'cart.0': { $exists: true }
        });
        
        console.log(`\nBefore clearing:`);
        console.log(`  Total users: ${totalUsers}`);
        console.log(`  Users with items in cart: ${usersWithCartsBefore}`);

        // Clear all carts
        console.log('\nClearing all carts...');
        const result = await User.updateMany(
            {}, 
            { $set: { cart: [] } }
        );
        
        console.log(`✓ Updated ${result.modifiedCount} users`);

        // Verify it worked
        const usersWithCartsAfter = await User.countDocuments({ 
            'cart.0': { $exists: true }
        });
        
        console.log(`\nAfter clearing:`);
        console.log(`  Users with items in cart: ${usersWithCartsAfter}`);
        
        if (usersWithCartsAfter === 0) {
            console.log('\n✅ SUCCESS: All users now have empty carts!');
        } else {
            console.log(`\n⚠ WARNING: ${usersWithCartsAfter} users still have items in cart`);
        }

        // Show sample users
        const sampleUsers = await User.find({}).select('email cart').limit(3);
        console.log('\nSample users:');
        sampleUsers.forEach(user => {
            console.log(`  - ${user.email}: ${user.cart?.length || 0} items in cart`);
        });

        await mongoose.connection.close();
        console.log('\n✓ Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('\n✗ Error:', error.message);
        process.exit(1);
    }
};

clearAllCarts();