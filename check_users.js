var mongoose = require('mongoose');
var User = require('./models/User');
var dotenv = require('dotenv');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mansara-db')
    .then(async () => {
        console.log('Connected to MongoDB');
        const users = await User.find({}, 'email role isVerified');
        console.log(JSON.stringify(users, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
