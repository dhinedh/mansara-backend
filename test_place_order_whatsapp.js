// test_place_order_whatsapp.js
require('dotenv').config();
const whatsappService = require('./utils/WhatsAppService');

const TEST_PHONE = '9342400879';

async function testOrderPlacement() {
  console.log(`📦 Simulating live Order Placement and triggering Customer & Admin WhatsApp notifications for phone: ${TEST_PHONE}...`);

  const mockOrder = {
    orderId: `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    total: 1250,
    paymentMethod: 'Prepaid / Online',
    paymentStatus: 'Paid',
    deliveryAddress: {
      firstName: 'Mansara',
      lastName: 'Customer',
      phone: TEST_PHONE,
      street: '123 Organic Park Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      zip: '600077'
    },
    items: [
      { name: 'Premium Chili Powder (500g)', quantity: 2, price: 350 },
      { name: 'Ulunthu Classic Mix (1kg)', quantity: 1, price: 550 }
    ]
  };

  const mockUser = {
    name: 'Mansara Customer',
    phone: TEST_PHONE,
    whatsapp: TEST_PHONE
  };

  try {
    console.log('\n1. Triggering Customer Order Confirmation WhatsApp Notification...');
    const custRes = await whatsappService.sendOrderConfirmation(mockOrder, mockUser);
    console.log('✅ Customer Order Confirmation Result:', JSON.stringify(custRes, null, 2));
  } catch (err) {
    console.error('❌ Customer Order Confirmation Error:', err.response?.data || err.message);
  }

  try {
    console.log('\n2. Triggering Admin New Order Alert WhatsApp Notification...');
    const adminRes = await whatsappService.sendAdminOrderNotification(mockOrder, mockUser);
    console.log('✅ Admin Order Alert Result:', JSON.stringify(adminRes, null, 2));
  } catch (err) {
    console.error('❌ Admin Order Alert Error:', err.response?.data || err.message);
  }

  console.log('\n🎉 Order Simulation Completed!');
}

testOrderPlacement();
