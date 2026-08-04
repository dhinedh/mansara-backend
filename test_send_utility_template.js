// test_send_utility_template.js
require('dotenv').config();
const whatsappService = require('./utils/WhatsAppService');

const TEST_PHONE = '9342400879';

async function runTest() {
  console.log(`🚀 Testing direct WhatsApp Utility Template delivery to phone: ${TEST_PHONE} (no 'Hi' required)...`);

  try {
    console.log('\n--- 1. Testing universal_notification Utility Template ---');
    const res1 = await whatsappService.sendMetaCloudMessage(
      TEST_PHONE,
      '🎉 Test Order Confirmation #1025 for Mansara Foods! Items are ready for shipping.'
    );
    console.log('✅ Result 1 (universal_notification):', JSON.stringify(res1, null, 2));
  } catch (err) {
    console.error('❌ Result 1 Error:', err.response?.data || err.message);
  }
  
  try {
    console.log('\n--- 2. Testing sales_lead_alert Utility Template ---');
    const res2 = await whatsappService.sendSalesLeadAlertTemplate(TEST_PHONE, {
      customerName: 'Test Prospect',
      phone: TEST_PHONE,
      requirement: 'Chili Powder Bulk Order (50 Cartons)',
      source: 'Mansara Website Bot'
    });
    console.log('✅ Result 2 (sales_lead_alert):', JSON.stringify(res2, null, 2));
  } catch (err) {
    console.error('❌ Result 2 Error:', err.response?.data || err.message);
  }

  console.log('\n🏁 Test completed!');
}

runTest();
