require('dotenv').config();
const notificationService = require('./utils/notificationService');

const mockOrder = {
    orderId: 'LIVE-TEST-999',
    total: 2450,
    items: [
        { name: 'Kashmir Honey (500g)', quantity: 2 },
        { name: 'A2 Desi Ghee (1L)', quantity: 1 },
        { name: 'Organic Turmeric', quantity: 3 }
    ],
    deliveryAddress: {
        firstName: 'Murali',
        lastName: 'Admin',
        street: '123 Heritage Lane, Palace Road',
        city: 'Chennai',
        state: 'Tamil Nadu',
        zip: '600001',
        phone: '9876543210' // This will be used for the WhatsApp link
    }
};

const mockUser = {
    name: 'Murali',
    email: 'murali@example.com'
};

async function testNtfy() {
    console.log('🚀 Triggering live ntfy test...');
    try {
        await notificationService._sendNtfyAlert(mockOrder, mockUser);
        console.log('✅ Test notification sent! Check your ntfy app.');
    } catch (err) {
        console.error('❌ Test failed:', err.message);
    }
}

testNtfy();
