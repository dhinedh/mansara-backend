const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mansara-db')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('DB Connection Error:', err);
        process.exit(1);
    });

const users = [
    {
        email: 'ceo@mansarafoods.com',
        name: 'CEO',
        role: 'admin',
        permissions: {
            offers: 'limited', combos: 'limited', content: 'limited', blog: 'limited', press: 'limited', careers: 'limited', banners: 'limited',
            products: 'view', stocks: 'view', categories: 'view', orders: 'view', customers: 'view',
            settings: 'none'
        }
    },
    {
        email: 'director@mansarafoods.com',
        name: 'Director',
        role: 'user', // "No Access" implies regular user or even restricted admin? Let's say user with no permissions.
        permissions: {
            products: 'none', stocks: 'none', categories: 'none', offers: 'none', combos: 'none', orders: 'none', customers: 'none', content: 'none', blog: 'none', press: 'none', careers: 'none', banners: 'none', settings: 'none'
        }
    },
    {
        email: 'accounts@mansarafoods.com',
        name: 'Accounts',
        role: 'admin',
        permissions: {
            offers: 'view', orders: 'view', customers: 'view'
        }
    },
    {
        email: 'compliance@mansarafoods.com',
        name: 'Compliance',
        role: 'admin',
        permissions: {
            press: 'view'
        }
    },
    {
        email: 'sales@mansarafoods.com',
        name: 'Sales',
        role: 'admin',
        permissions: {
            offers: 'limited', combos: 'limited', orders: 'limited',
            stocks: 'view', customers: 'view'
        }
    },
    {
        email: 'order-updates@mansarafoods.com',
        name: 'Order Updates',
        role: 'admin',
        permissions: {
            orders: 'view'
        }
    },
    {
        email: 'support@mansarafoods.com',
        name: 'Support',
        role: 'admin',
        permissions: {
            orders: 'limited', customers: 'limited'
        }
    },
    {
        email: 'feedback@mansarafoods.com',
        name: 'Feedback',
        role: 'admin',
        permissions: {
            blog: 'view'
        }
    },
    {
        email: 'contact@mansarafoods.com',
        name: 'Contact',
        role: 'admin',
        permissions: {
            content: 'limited'
        }
    },
    {
        email: 'careers@mansarafoods.com',
        name: 'Careers',
        role: 'admin',
        permissions: {
            careers: 'limited'
        }
    },
    {
        email: 'backend-admin@mansarafoods.internal',
        name: 'Super Admin',
        role: 'admin',
        permissions: {
            products: 'full', stocks: 'full', categories: 'full', offers: 'full', combos: 'full', orders: 'full', customers: 'full', content: 'full', blog: 'full', press: 'full', careers: 'full', banners: 'full', settings: 'full'
        }
    }
];

const seedUsers = async () => {
    try {
        console.log('Seeding Users...');

        for (const u of users) {
            // Set default permissions for missing fields to 'none'
            const fullPermissions = {
                products: 'none', stocks: 'none', categories: 'none', offers: 'none', combos: 'none', orders: 'none', customers: 'none', content: 'none', blog: 'none', press: 'none', careers: 'none', banners: 'none', settings: 'none',
                ...u.permissions
            };

            const existingUser = await User.findOne({ email: u.email });

            if (existingUser) {
                console.log(`Updating ${u.email}...`);
                existingUser.permissions = fullPermissions;
                existingUser.role = u.role; // Ensure role is correct
                await existingUser.save();
            } else {
                console.log(`Creating ${u.email}...`);
                await User.create({
                    email: u.email,
                    name: u.name,
                    password: 'password123', // Default password
                    role: u.role,
                    permissions: fullPermissions,
                    isVerified: true,
                    status: 'Active'
                });
            }
        }

        console.log('Seeding Complete!');
        process.exit(0);
    } catch (error) {
        console.error('Seeding Failed:', error);
        process.exit(1);
    }
};

seedUsers();
