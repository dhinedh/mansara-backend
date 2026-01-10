const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const Order = require('./models/Order');
const { Product } = require('./models/Product');
const User = require('./models/User');

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        console.log('Testing Order Aggregation...');
        const orderStatsAgg = await Order.aggregate([
            {
                $facet: {
                    total: [{ $count: 'count' }],
                    pending: [
                        { $match: { orderStatus: { $in: ['Ordered', 'Processing'] } } },
                        { $count: 'count' }
                    ],
                    today: [
                        {
                            $match: {
                                createdAt: {
                                    $gte: new Date(new Date().setHours(0, 0, 0, 0))
                                }
                            }
                        },
                        { $count: 'count' }
                    ],
                    revenue: [
                        { $match: { orderStatus: { $ne: 'Cancelled' } } },
                        { $group: { _id: null, total: { $sum: '$total' } } }
                    ],
                    recent: [
                        { $sort: { createdAt: -1 } },
                        { $limit: 5 },
                        {
                            $lookup: {
                                from: 'users',
                                localField: 'user',
                                foreignField: '_id',
                                as: 'userInfo'
                            }
                        }
                    ]
                }
            }
        ]);
        console.log('Aggregation result:', JSON.stringify(orderStatsAgg, null, 2));

        console.log('Testing Product Count...');
        const pCount = await Product.countDocuments({ isActive: true });
        console.log('Product count:', pCount);

        console.log('Testing User Count...');
        const uCount = await User.countDocuments();
        console.log('User count:', uCount);

        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
};

run();
