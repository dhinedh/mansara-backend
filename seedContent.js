const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Content = require('./models/Content');
const Banner = require('./models/Banner');
const Hero = require('./models/Hero');
const Setting = require('./models/Setting');

// Load env vars
dotenv.config();

const contentSeed = [
    {
        slug: 'contact',
        sections: {
            intro: "We're Here to Help",
            address: "MANSARA FOODS\nNo. 15, Government Hospital Opposite,\nTimiri Road, Kalavai, Ranipet,\nTamil Nadu – 632506, India",
            email: "mansarafoods@gmail.com",
            phone: "+91 88388 87064",
            commitment: "🌿 Our Commitment: Every message matters to us. We respond with the same care, honesty, and responsibility that define MANSARA."
        }
    },
    {
        slug: 'about',
        sections: {
            intro: "MANSARA was founded in December 2020 with a deep personal purpose — to make pure, nourishing food a part of everyday life, especially for those seeking better balance, wellness, and long-term health.\nThe brand was born from lived experience, care, and conviction — not just an idea.",
            story: "MANSARA began its journey with a focus on pure, traditionally prepared cooking essentials — Groundnut oil, Sesame oil, Coconut oil, and Ghee — made with an uncompromising commitment to quality, purity, and honesty.\nAs trust grew, so did our offerings. We expanded into nutritious porridge mixes such as Urad Porridge Mix and Kavuni Porridge Mix, and later introduced authentic millet idly podi — combining traditional recipes with modern-day convenience.\nEach product is designed to be easy to cook, clean in ingredients, and gentle in processing, making healthy eating practical for today’s lifestyle.",
            founder_note: "Founder – Deepika Harikrishnan\nMANSARA was founded by Deepika Harikrishnan, driven by her personal journey and lived experience with hormonal health challenges.\nThrough this journey, she realized the powerful role that clean, balanced, and traditional foods play in supporting overall well-being. Her aim was never to create “special diet food,” but to make everyday food better, purer, and more nourishing — so families can support their health naturally through what they eat daily.\nMANSARA reflects this belief — that food should support the body, not burden it, and that long-term wellness begins with mindful, honest nourishment.",
            values: "M – Modern, Cloud-Enabled Quality: Using modern systems to ensure transparency, consistency, and trust.\nA – Authentic, Heart-Centered Nutrition: Products created with genuine care for family health.\nN – Naturally Clean Ingredients: Pure, safe, and wholesome — free from unnecessary additives.\nS – Smart, Sustainable Systems: Responsible processes that respect people, resources, and the planet.\nA – Advanced, Light Processing: Gentle methods that help retain natural nutrients and freshness.\nR – Reliable & Responsible: A brand that stands by its values at every step.\nA – Always Pure: An unwavering commitment to honesty and purity.",
            vision: "To become a trusted wellness food brand that supports healthier lifestyles by offering pure, nourishing food rooted in tradition and enhanced by modern practices.",
            mission: "• To provide clean, wholesome foods inspired by traditional wisdom\n• To support everyday wellness through simple, nourishing ingredients\n• To create easy-to-cook products suited for modern living\n• To maintain purity, transparency, and responsibility across all processes",
            promise: "At MANSARA, we believe true nourishment starts from within.\nEvery product we create is a step toward better balance, mindful eating, and long-term well-being."
        }
    },
    {
        slug: 'home_highlights',
        sections: {
            offers_title: "Seasonal Offers",
            offers_description: "Don't miss out on our limited-time seasonal specials.",
            combos_title: "Value Combos",
            combos_description: "Perfectly paired products for your daily needs.",
            new_arrivals_title: "Just In",
            new_arrivals_description: "Be the first to try our latest creations."
        }
    }
];

const bannerSeed = [
    {
        page: 'home',
        title: 'Summer Refresh',
        subtitle: 'Cool down with our natural drink mixes',
        image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80',
        link: '/products?category=beverages',
        active: true,
        id: 'banner-1'
    },
    {
        page: 'products',
        title: 'Spices of India',
        subtitle: 'Authentic blends for your kitchen',
        image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80',
        link: '/products?category=spices',
        active: true,
        id: 'banner-2'
    }
];

const settingSeed = {
    key: 'site_settings',
    website_name: "MANSARA Foods",
    contact_email: "mansarafoods@gmail.com",
    phone_number: "+91 88388 87064",
    address: "No. 15, Government Hospital Opposite, Timiri Road, Kalavai, Ranipet, Tamil Nadu – 632506, India",
    facebook_url: "https://facebook.com",
    instagram_url: "https://instagram.com",
    twitter_url: "https://twitter.com"
};

const heroSeed = [
    {
        key: 'home',
        data: [
            {
                id: '1',
                image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80',
                title: 'Pure Tradition, Modern Wellness',
                subtitle: 'Experience the authentic taste of South India with our handcrafted, preservative-free foods.',
                ctaText: 'Shop Now',
                ctaLink: '/products'
            },
            {
                id: '2',
                image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80',
                title: 'Nourish Your Family',
                subtitle: 'Wholesome porridge mixes and essentials made with care for your loved ones.',
                ctaText: 'View Products',
                ctaLink: '/products'
            }
        ]
    },
    {
        key: 'newArrivals',
        data: {
            image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80',
            title: 'New Arrivals',
            subtitle: 'Discover our latest additions to the MANSARA family.'
        }
    },
    {
        key: 'offers',
        data: {
            image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80',
            title: 'Special Offers',
            subtitle: 'Grab these amazing deals on your favorite MANSARA products.'
        }
    },
    {
        key: 'homeSettings',
        data: { interval: 5000 }
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mansara-db');
        console.log('MongoDB Connected');

        // Seed Content
        for (const page of contentSeed) {
            await Content.findOneAndUpdate(
                { slug: page.slug },
                { $set: { sections: page.sections } },
                { upsert: true, new: true }
            );
        }
        console.log('Content seeded');

        // Seed Banners
        await Banner.deleteMany({}); // Clear existing to avoid dups if run multiple times without unique keys
        await Banner.insertMany(bannerSeed);
        console.log('Banners seeded');

        // Seed Settings
        await Setting.findOneAndUpdate(
            { key: settingSeed.key },
            { $set: settingSeed },
            { upsert: true, new: true }
        );
        console.log('Settings seeded');

        // Seed Hero
        for (const item of heroSeed) {
            await Hero.findOneAndUpdate(
                { key: item.key },
                { $set: { data: item.data } },
                { upsert: true, new: true }
            );
        }
        console.log('Hero seeded');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedDB();
