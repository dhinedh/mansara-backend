const mongoose = require('mongoose');
const dotenv = require('dotenv');
// Adjust path to models if needed
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('Connected to DB');
        await testAggregation();
        mongoose.connection.close();
    })
    .catch(err => {
        console.error('Connection error:', err);
    });

async function testAggregation() {
    try {
        console.log('Starting aggregation test...');
        const page = 1;
        const limit = 50;
        const skip = 0;

        console.log('Running aggregate...');
        const usersAgg = await User.aggregate([
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: 'orders',
                    localField: '_id',
                    foreignField: 'user',
                    as: 'userOrders'
                }
            },
            {
                $addFields: {
                    totalOrders: { $size: '$userOrders' },
                    totalSpent: { $sum: '$userOrders.total' }
                }
            },
            {
                $project: {
                    password: 0,
                    userOrders: 0,
                    __v: 0,
                    resetPasswordToken: 0,
                    resetPasswordExpire: 0,
                    otp: 0,
                    otpExpire: 0
                }
            }
        ])
            .maxTimeMS(15000)
            .exec();

        console.log('Aggregation success! Count:', usersAgg.length);
        if (usersAgg.length > 0) {
            console.log('First user sample:', usersAgg[0]);
        }

        console.log('Running countDocuments...');
        const total = await User.countDocuments()
            .maxTimeMS(5000)
            .exec();
        console.log('Total users:', total);

    } catch (error) {
        console.error('Aggregation FAILED:', error);
    }
}
