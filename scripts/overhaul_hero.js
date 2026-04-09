const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const BannerSchema = new mongoose.Schema({
    page: String,
    image: String,
    mobileImage: String,
    title: String,
    subtitle: String,
    link: String,
    order: Number,
    active: Boolean
}, { strict: false });

const Banner = mongoose.models.Banner || mongoose.model('Banner', BannerSchema);

const HeroSchema = new mongoose.Schema({
    key: String,
    data: mongoose.Schema.Types.Mixed,
    isActive: Boolean
}, { strict: false });

const Hero = mongoose.models.Hero || mongoose.model('Hero', HeroSchema);

async function overhaulHero() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Delete existing homepage banners
        const deleteBanners = await Banner.deleteMany({ page: 'home' });
        console.log(`Deleted ${deleteBanners.deletedCount} existing homepage banners.`);

        // 2. Delete existing home hero content
        const deleteHero = await Hero.deleteMany({ key: 'home' }); // Common key for home hero configuration
        console.log(`Deleted ${deleteHero.deletedCount} existing homepage hero configurations.`);

        // 3. Insert new premium banner
        const newBanner = new Banner({
            page: 'home',
            image: 'https://res.cloudinary.com/dprsmi4k8/image/upload/v1775706628/mansara/banners/kyif3skzyglg2dphsrte.jpg',
            mobileImage: 'https://res.cloudinary.com/dprsmi4k8/image/upload/v1775706632/mansara/banners/pgeyye9ckvxdji5e97ge.jpg',
            title: 'Nourish from Within',
            subtitle: 'Traditional wisdom meets modern nutrition. Experience the pure goodness of handcrafted grains.',
            link: '/products',
            order: 0,
            active: true
        });

        await newBanner.save();
        console.log('New premium responsive banner seeded.');

        process.exit(0);
    } catch (err) {
        console.error('Overhaul Failed:', err);
        process.exit(1);
    }
}

overhaulHero();
