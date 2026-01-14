const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load env from current directory
dotenv.config({ path: path.join(__dirname, '.env') });

const Hero = require('./models/Hero');

console.log('Env Keys:', Object.keys(process.env).filter(k => k.includes('MONGO') || k.includes('DB')));
console.log('Attempting to connect with URI length:', process.env.MONGODB_URI ? process.env.MONGODB_URI.length : 'UNDEFINED');

const heroesData = [
    {
        key: 'home',
        data: [
            {
                id: '1',
                image: '/hero-combo-5day.jpg',
                title: '',
                subtitle: '',
                ctaText: '',
                ctaLink: '/combos',
                alignment: 'center'
            },
            {
                id: '2',
                image: '/hero-launch-offer.png',
                title: '',
                subtitle: '',
                ctaText: '',
                ctaLink: '/offers',
                alignment: 'center'
            }
        ],
        isActive: true
    },
    {
        key: 'combos',
        data: {
            image: '/hero-combos-final.png',
            title: '',
            subtitle: ''
        },
        isActive: true
    },
    {
        key: 'products',
        data: {
            image: '/hero-products.png',
            title: '',
            subtitle: ''
        },
        isActive: true
    }
];

const seedHero = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        for (const h of heroesData) {
            const exists = await Hero.findOne({ key: h.key });
            if (exists) {
                console.log(`Hero config for ${h.key} already exists. Updating...`);
                await Hero.findOneAndUpdate({ key: h.key }, h);
            } else {
                console.log(`Creating new Hero config for ${h.key}...`);
                await Hero.create(h);
            }
        }

        console.log('Hero Seeded Successfully');
        process.exit();
    } catch (error) {
        console.error('Error seeding hero:', error);
        process.exit(1);
    }
};

seedHero();
