const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Order = require('../models/Order');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('✅ Connected to MongoDB');

        try {
            const users = await User.find({});
            console.log(`Analyzing ${users.length} users...`);

            let updatedCount = 0;

            for (const user of users) {
                // Find all orders for this user
                const orders = await Order.find({ user: user._id });
                const totalOrdersCount = orders.length;
                const totalSpentSum = orders.reduce((sum, order) => sum + (order.total || 0), 0);

                // Check if current stats mismatch
                if (user.totalOrders !== totalOrdersCount || user.totalSpent !== totalSpentSum) {
                    console.log(`Updating stats for ${user.name} (${user.email}):`);
                    console.log(`  Orders: ${user.totalOrders} -> ${totalOrdersCount}`);
                    console.log(`  Spent: ₹${user.totalSpent} -> ₹${totalSpentSum}`);

                    user.totalOrders = totalOrdersCount;
                    user.totalSpent = totalSpentSum;
                    
                    // Also find the latest order date
                    if (orders.length > 0) {
                        const sortedOrders = [...orders].sort((a, b) => b.createdAt - a.createdAt);
                        user.lastOrderDate = sortedOrders[0].createdAt;
                    }

                    await user.save();
                    updatedCount++;
                }
            }

            console.log(`\n🎉 Process completed! Updated ${updatedCount} users.`);

        } catch (error) {
            console.error('❌ Error during synchronization:', error);
        } finally {
            mongoose.connection.close();
            console.log('🔌 Disconnected from MongoDB');
        }
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err);
    });
