const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: path.join(__dirname, '.env') });

const BlogPost = require('./models/BlogPost');
const Career = require('./models/Career');
const PressRelease = require('./models/PressRelease');

const clearData = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        console.log('Clearing Marketing Content...');

        const blogResult = await BlogPost.deleteMany({});
        console.log(`Deleted ${blogResult.deletedCount} Blog Posts.`);

        const careerResult = await Career.deleteMany({});
        console.log(`Deleted ${careerResult.deletedCount} Careers.`);

        const pressResult = await PressRelease.deleteMany({});
        console.log(`Deleted ${pressResult.deletedCount} Press Releases.`);

        console.log('All marketing content cleared.');
        process.exit(0);

    } catch (error) {
        console.error('Error clearing data:', error);
        process.exit(1);
    }
};

clearData();
