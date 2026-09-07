// test_all_templates_and_bot.js
require('dotenv').config();
const axios = require('axios');

async function testTemplates() {
  const token = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.META_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;
  const targetPhone = '919342400879';

  console.log('\n======================================================');
  console.log('🔍 TESTING ALL META TEMPLATES TO:', targetPhone);
  console.log('======================================================\n');

  // Test 1: sales_team_alert
  try {
    console.log('Testing 1: sales_team_alert...');
    const r1 = await axios.post(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: targetPhone,
      type: 'template',
      template: {
        name: 'sales_team_alert',
        language: { code: 'en_US' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: 'Test Admin' },
            { type: 'text', text: 'Mansara Foods Operations' },
            { type: 'text', text: targetPhone },
            { type: 'text', text: '🚨 MANSARA OPERATIONS TEST ALERT - Testing sales_team_alert' }
          ]
        }]
      }
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('✅ sales_team_alert Response:', r1.data.messages[0].id);
  } catch (e) {
    console.error('❌ sales_team_alert Error:', e.response?.data || e.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // Test 2: order_status_utility
  try {
    console.log('Testing 2: order_status_utility...');
    const r2 = await axios.post(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: targetPhone,
      type: 'template',
      template: {
        name: 'order_status_utility',
        language: { code: 'en_US' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: 'Admin' },
            { type: 'text', text: 'ORD-TEST-001' },
            { type: 'text', text: 'Test Status' },
            { type: 'text', text: 'Testing order_status_utility delivery' }
          ]
        }]
      }
    }, { headers: { Authorization: `Bearer ${token}` } });
    console.log('✅ order_status_utility Response:', r2.data.messages[0].id);
  } catch (e) {
    console.error('❌ order_status_utility Error:', e.response?.data || e.message);
  }

  await new Promise(r => setTimeout(r, 2000));

  // Test 3: Local WhatsApp Bot Automation API (Render / Local Server)
  try {
    const botUrl = process.env.WHATSAPP_BOT_URL || 'https://whatapp-automation-kxml.onrender.com';
    console.log(`Testing 3: WhatsApp Bot Automation API (${botUrl})...`);
    const r3 = await axios.post(`${botUrl}/api/send-message`, {
      phone: targetPhone,
      message: '🚨 *MANSARA OPERATIONS ALERT: TEST MESSAGE*\n\nTesting WhatsApp Bot Automation API delivery to your phone.'
    }, { timeout: 5000 });
    console.log('✅ Bot API Response:', r3.data);
  } catch (e) {
    console.error('❌ Bot API Error:', e.response?.data || e.message);
  }
}

testTemplates();
