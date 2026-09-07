// test_all_three_admin_alerts.js
require('dotenv').config();
const whatsappService = require('./utils/WhatsAppService');
const crmWhatsappService = require('../crm/backend/src/utils/whatsappService');

const TEST_ADMIN_PHONE = '9342400879';

async function runAllAlertsTest() {
  console.log(`🚀 Testing All 3 Admin Meta WhatsApp Alerts to phone: ${TEST_ADMIN_PHONE}...`);

  try {
    console.log('\n--- 1. Testing Product Review Moderation Alert ---');
    const res1 = await whatsappService.sendAdminReviewAlert(
      { rating: 5, comment: 'Ragi Choco Malt is extremely delicious and healthy! My kids love it.' },
      { name: 'Ragi Choco Malt 250g' },
      { name: 'Sujatha', email: 'sujatha@gmail.com' }
    );
    console.log('✅ Result 1 (Review Moderation Alert): Delivered!');
  } catch (err) {
    console.error('❌ Result 1 Error:', err.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  try {
    console.log('\n--- 2. Testing New Customer Support Ticket Alert ---');
    const res2 = await whatsappService.sendAdminTicketAlert(
      'TK-8821',
      'Need express delivery to Coimbatore by Friday for family event',
      { name: 'Karthik', phone: '9876543210' }
    );
    console.log('✅ Result 2 (Customer Support Ticket Alert): Delivered!');
  } catch (err) {
    console.error('❌ Result 2 Error:', err.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  try {
    console.log('\n--- 3. Testing B2B Dealer Application Alert ---');
    const res3 = await crmWhatsappService.sendVendorWhatsAppRegistration({
      phone: '9840198401',
      name: 'Venkatesh',
      companyName: 'Sri Lakshmi Organic Organics',
      email: 'dealer.lakshmi@gmail.com',
      dealerCategory: 'DISTRIBUTOR',
      defaultMargin: 20,
      approvalStatus: 'PENDING'
    });
    console.log('✅ Result 3 (B2B Dealer Application Alert): Delivered!');
  } catch (err) {
    console.error('❌ Result 3 Error:', err.message);
  }

  console.log('\n🏁 All 3 Admin Alerts Test Finished!');
}

runAllAlertsTest();
