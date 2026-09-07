// test_all_remaining_admin_features.js
require('dotenv').config();
const whatsappService = require('./utils/WhatsAppService');
const crmWhatsappService = require('../crm/backend/src/utils/whatsappService');

const TEST_ADMIN_PHONE = '9342400879';

async function runRemainingFeaturesTest() {
  console.log(`🚀 Testing All 5 Remaining Admin WhatsApp Alerts & Features to phone: ${TEST_ADMIN_PHONE}...`);

  // 1. Order Cancellation & Refund Request Alert
  try {
    console.log('\n--- 1. Testing Order Cancellation & Refund Request Alert ---');
    await whatsappService.sendAdminCancellationAlert(
      { orderId: 'ORD-TEST-901', total: 1850 },
      'Customer requested cancellation due to address change',
      { name: 'Ramesh Kumar', phone: '9845012345' }
    );
    console.log('✅ Result 1 (Order Cancellation Alert): Delivered!');
  } catch (err) {
    console.error('❌ Result 1 Error:', err.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // 2. High-Value Abandoned Cart Alert
  try {
    console.log('\n--- 2. Testing High-Value Abandoned Cart Alert ---');
    await whatsappService.sendAdminHighValueCartAlert(
      { name: 'Priya Sundaram', phone: '9790123456' },
      3450,
      '3x Ultimate Wellness Combo, 2x Ragi Choco Malt 500g'
    );
    console.log('✅ Result 2 (High-Value Abandoned Cart Alert): Delivered!');
  } catch (err) {
    console.error('❌ Result 2 Error:', err.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // 3. B2B Wholesale Order Admin Alert
  try {
    console.log('\n--- 3. Testing B2B Wholesale Order Admin Alert ---');
    await crmWhatsappService.sendAdminB2BOrderAlert({
      orderId: 'WHOLESALE-ORD-501',
      companyName: 'Annapoorna Supermarket Chain',
      dealerName: 'Murugan',
      totalAmount: 14500,
      itemsSummary: '50x Nutriminix Health Mix 500g, 30x Urad Porridge 500g',
      phone: '9840198401'
    });
    console.log('✅ Result 3 (B2B Wholesale Order Alert): Delivered!');
  } catch (err) {
    console.error('❌ Result 3 Error:', err.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // 4. Daily Business Performance Digest
  try {
    console.log('\n--- 4. Testing Daily Business Performance Digest Alert ---');
    await whatsappService.sendAdminDailyDigest({
      todayRevenue: 8450,
      todayOrders: 12,
      pendingOrders: 3,
      lowStockCount: 2,
      pendingReviews: 1
    });
    console.log('✅ Result 4 (Daily Business Digest Alert): Delivered!');
  } catch (err) {
    console.error('❌ Result 4 Error:', err.message);
  }

  console.log('\n🏁 All Remaining Admin WhatsApp Features Test Finished!');
}

runRemainingFeaturesTest();
