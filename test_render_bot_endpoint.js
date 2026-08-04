// test_render_bot_endpoint.js
const axios = require('axios');

const BOT_URL = 'https://whatapp-automation-kxml.onrender.com';
const TEST_PHONE = '919342400879';

async function testRenderBotEndpoints() {
  console.log(`🚀 Testing live Render Bot endpoints at ${BOT_URL}...`);

  try {
    console.log('\n1. Testing /api/notify-customer-order...');
    const custRes = await axios.post(`${BOT_URL}/api/notify-customer-order`, {
      phone: TEST_PHONE,
      orderId: `ORD-RENDER-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: 'Mansara Customer',
      items: [
        { name: 'Ragi Choco Malt (250g)', quantity: 2, price: 245 }
      ],
      total: 490,
      address: '123 Organic Park, Chennai - 600077',
      paymentMethod: 'Prepaid / Online',
      paymentStatus: 'Paid',
      trackingLink: 'https://mansarafoods.com/order-tracking/ORD-RENDER-1001'
    });
    console.log('✅ Customer Order Endpoint Response:', JSON.stringify(custRes.data, null, 2));
  } catch (err) {
    console.error('❌ Customer Order Endpoint Error:', err.response?.data || err.message);
  }

  try {
    console.log('\n2. Testing /api/notify-admin-order...');
    const adminRes = await axios.post(`${BOT_URL}/api/notify-admin-order`, {
      orderId: `ORD-RENDER-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: 'Mansara Customer',
      customerPhone: TEST_PHONE,
      address: '123 Organic Park, Chennai - 600077',
      items: [
        { name: 'Ragi Choco Malt (250g)', quantity: 2, price: 245 }
      ],
      total: 490,
      paymentMethod: 'Prepaid / Online',
      paymentStatus: 'Paid'
    });
    console.log('✅ Admin Order Endpoint Response:', JSON.stringify(adminRes.data, null, 2));
  } catch (err) {
    console.error('❌ Admin Order Endpoint Error:', err.response?.data || err.message);
  }

  console.log('\n🏁 Render Bot Test Completed!');
}

testRenderBotEndpoints();
