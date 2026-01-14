const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load env from current directory
dotenv.config({ path: path.join(__dirname, '.env') });

const Hero = require('./models/Hero');

console.log('Env Keys:', Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DB')));
console.log('Attempting to connect with URI length:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 'UNDEFINED');

const heroData = {
    key: 'home',
    data: [
        {
            id: '1',
            image: '/hero-combo-5day.jpg', // Using relative path for local file
            title: '', // Empty as requested
            subtitle: '', // Empty as requested
            ctaText: '', // Empty as requested
            ctaLink: '/combos',
            alignment: 'center'
        }
    ],
    isActive: true
};

const seedHero = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Check if exists
        const exists = await Hero.findOne({ key: 'home' });
        if (exists) {
            console.log('Hero config already exists. Updating...');
            await Hero.findOneAndUpdate({ key: 'home' }, heroData);
        } else {
            console.log('Creating new Hero config...');
            await Hero.create(heroData);
        }

        console.log('Hero Seeded Successfully');
        process.exit();
    } catch (error) {
        console.error('Error seeding hero:', error);
        process.exit(1);
    }
};

seedHero();
