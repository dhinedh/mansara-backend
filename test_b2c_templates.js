// test_b2c_templates.js
require('dotenv').config();
const whatsappService = require('./utils/WhatsAppService');

const TEST_PHONE = '9342400879';

async function runB2CTest() {
  console.log(`🚀 Testing direct B2C Meta WhatsApp Utility Templates to phone: ${TEST_PHONE}...`);

  try {
    console.log('\n--- 1. Testing order_shipped_utility ---');
    const res1 = await whatsappService.sendOrderShippedNotification(
      { orderId: 'ORD-TEST-101' },
      { name: 'Murali', phone: TEST_PHONE },
      'iCarry Express',
      'AWB12345678'
    );
    console.log('✅ Result 1 (order_shipped_utility):', JSON.stringify(res1, null, 2));
  } catch (err) {
    console.error('❌ Result 1 Error:', err.response?.data || err.message);
  }

  try {
    console.log('\n--- 2. Testing cart_recovery_v2 ---');
    const res2 = await whatsappService.sendCartRecoveryNotification(
      { name: 'Murali', phone: TEST_PHONE },
      'Ragi Choco Malt & Urad Porridge'
    );
    console.log('✅ Result 2 (cart_recovery_v2):', JSON.stringify(res2, null, 2));
  } catch (err) {
    console.error('❌ Result 2 Error:', err.response?.data || err.message);
  }

  try {
    console.log('\n--- 3. Testing review_request_utility ---');
    const res3 = await whatsappService.sendReviewRequest(
      { orderId: 'ORD-TEST-101' },
      { name: 'Murali', phone: TEST_PHONE }
    );
    console.log('✅ Result 3 (review_request_utility):', JSON.stringify(res3, null, 2));
  } catch (err) {
    console.error('❌ Result 3 Error:', err.response?.data || err.message);
  }

  console.log('\n🏁 B2C Meta Template Test Finished!');
}

runB2CTest();
