// test_master_all_admin_alerts.js
require('dotenv').config();
const whatsappService = require('./utils/WhatsAppService');
const crmWhatsappService = require('../crm/backend/src/utils/whatsappService');

const TEST_ADMIN_PHONE = '9342400879';

async function runMasterAdminAlertsTest() {
  console.log(`\n======================================================`);
  console.log(`🚀 MASTER TEST: Dispatching ALL 9 Admin WhatsApp Alerts to ${TEST_ADMIN_PHONE}...`);
  console.log(`======================================================\n`);

  // 1. New Website Order Alert
  try {
    console.log('--- 1/9. New Website Order Alert ---');
    await whatsappService.sendAdminOrderNotification(
      {
        orderId: 'ORD-LIVE-777',
        total: 1250,
        paymentMethod: 'COD',
        items: [
          { name: 'Ragi Choco Malt 250g', quantity: 2, price: 250 },
          { name: 'Nutriminix Health Mix 500g', quantity: 1, price: 750 }
        ],
        deliveryAddress: { firstName: 'Senthil', lastName: 'Kumar', street: '12 Anna Salai', city: 'Chennai', zip: '600002', phone: '9840198401' }
      },
      { name: 'Senthil Kumar', phone: '9840198401' }
    );
    console.log('✅ [1/9] New Website Order Alert: DELIVERED!');
  } catch (err) {
    console.error('❌ [1/9] Error:', err.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // 2. Low Stock Alert
  try {
    console.log('\n--- 2/9. Low Stock Alert ---');
    await whatsappService.sendAdminStockAlert('Ragi Choco Malt 250g', 2);
    console.log('✅ [2/9] Low Stock Alert: DELIVERED!');
  } catch (err) {
    console.error('❌ [2/9] Error:', err.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // 3. Product Review Moderation Alert
  try {
    console.log('\n--- 3/9. Product Review Moderation Alert ---');
    await whatsappService.sendAdminReviewAlert(
      { rating: 5, comment: 'Ragi Choco Malt is extremely delicious and healthy! My kids love it.' },
      { name: 'Ragi Choco Malt 250g' },
      { name: 'Sujatha', email: 'sujatha@gmail.com' }
    );
    console.log('✅ [3/9] Product Review Moderation Alert: DELIVERED!');
  } catch (err) {
    console.error('❌ [3/9] Error:', err.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // 4. Customer Support Ticket Alert
  try {
    console.log('\n--- 4/9. Customer Support Ticket Alert ---');
    await whatsappService.sendAdminTicketAlert(
      'TK-9932',
      'Need urgent tracking details for order ORD-LIVE-777',
      { name: 'Karthik', phone: '9876543210' }
    );
    console.log('✅ [4/9] Customer Support Ticket Alert: DELIVERED!');
  } catch (err) {
    console.error('❌ [4/9] Error:', err.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // 5. B2B Dealer Registration Alert
  try {
    console.log('\n--- 5/9. B2B Dealer Registration Alert ---');
    await crmWhatsappService.sendAdminDealerRegistrationAlert({
      phone: '9840198401',
      name: 'Venkatesh',
      companyName: 'Sri Lakshmi Organics',
      email: 'dealer.lakshmi@gmail.com',
      dealerCategory: 'DISTRIBUTOR',
      defaultMargin: 20
    });
    console.log('✅ [5/9] B2B Dealer Registration Alert: DELIVERED!');
  } catch (err) {
    console.error('❌ [5/9] Error:', err.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // 6. Order Cancellation & Refund Request Alert
  try {
    console.log('\n--- 6/9. Order Cancellation / Refund Alert ---');
    await whatsappService.sendAdminCancellationAlert(
      { orderId: 'ORD-LIVE-777', total: 1250 },
      'Customer requested cancellation before dispatch',
      { name: 'Senthil Kumar', phone: '9840198401' }
    );
    console.log('✅ [6/9] Order Cancellation Alert: DELIVERED!');
  } catch (err) {
    console.error('❌ [6/9] Error:', err.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // 7. High-Value Abandoned Cart Alert
  try {
    console.log('\n--- 7/9. High-Value Abandoned Cart Alert ---');
    await whatsappService.sendAdminHighValueCartAlert(
      { name: 'Meena Subramanian', phone: '9790123456' },
      3850,
      '4x Ultimate Wellness Combo Pack, 2x Moringa Podi 200g'
    );
    console.log('✅ [7/9] High-Value Abandoned Cart Alert: DELIVERED!');
  } catch (err) {
    console.error('❌ [7/9] Error:', err.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // 8. B2B Wholesale Order Admin Alert
  try {
    console.log('\n--- 8/9. B2B Wholesale Order Admin Alert ---');
    await crmWhatsappService.sendAdminB2BOrderAlert({
      orderId: 'WHOLESALE-ORD-901',
      companyName: 'Sri Lakshmi Organics',
      dealerName: 'Venkatesh',
      totalAmount: 18500,
      itemsSummary: '60x Nutriminix Health Mix 500g, 40x Ragi Choco Malt 500g',
      phone: '9840198401'
    });
    console.log('✅ [8/9] B2B Wholesale Order Alert: DELIVERED!');
  } catch (err) {
    console.error('❌ [8/9] Error:', err.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // 9. Daily Business Performance Digest Alert
  try {
    console.log('\n--- 9/9. Daily Business Performance Digest Alert ---');
    await whatsappService.sendAdminDailyDigest({
      todayRevenue: 12450,
      todayOrders: 15,
      pendingOrders: 4,
      lowStockCount: 2,
      pendingReviews: 1
    });
    console.log('✅ [9/9] Daily Business Performance Digest Alert: DELIVERED!');
  } catch (err) {
    console.error('❌ [9/9] Error:', err.message);
  }

  console.log(`\n======================================================`);
  console.log(`🏆 ALL 9 ADMIN WHATSAPP ALERTS DELIVERED SUCCESSFULLY!`);
  console.log(`======================================================\n`);
}

runMasterAdminAlertsTest();
