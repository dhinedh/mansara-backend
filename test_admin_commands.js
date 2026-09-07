// test_admin_commands.js
require('dotenv').config();
const whatsappService = require('./utils/WhatsAppService');

const ADMIN_PHONE = '9342400879';

async function runAdminTest() {
  console.log(`🚀 Testing Admin WhatsApp Alerts and Meta Utility Delivery to Admin Phone: ${ADMIN_PHONE}...`);

  try {
    console.log('\n--- 1. Testing Admin New Order Notification ---');
    const res1 = await whatsappService.sendAdminOrderNotification({
      orderId: 'ORD-ADMIN-101',
      total: 1250,
      paymentMethod: 'COD',
      items: [{ name: 'Ragi Choco Malt', quantity: 2, price: 250 }, { name: 'Nutriminix Health Mix', quantity: 3, price: 250 }],
      deliveryAddress: { firstName: 'Test Customer', phone: '9876543210', street: '123 Main St', city: 'Chennai', zip: '600001' }
    }, { name: 'Test Customer', phone: '9876543210' });

    console.log('✅ Result 1 (Admin New Order Alert):', JSON.stringify(res1, null, 2));
  } catch (err) {
    console.error('❌ Result 1 Error:', err.response?.data || err.message);
  }

  try {
    console.log('\n--- 2. Testing Admin Low Stock Warning ---');
    const res2 = await whatsappService.sendAdminStockAlert('Ragi Choco Malt 250g', 3);
    console.log('✅ Result 2 (Admin Stock Alert):', JSON.stringify(res2, null, 2));
  } catch (err) {
    console.error('❌ Result 2 Error:', err.response?.data || err.message);
  }

  console.log('\n🏁 Admin Test Finished!');
}

runAdminTest();
