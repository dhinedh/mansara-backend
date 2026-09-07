// test_recipient_check.js
require('dotenv').config();
const axios = require('axios');

async function testRecipients() {
  const token = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.META_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;

  const testNumbers = ['919342400879', '918838887064'];

  for (const phone of testNumbers) {
    console.log(`\n======================================================`);
    console.log(`Testing Meta API Alert to: ${phone}`);
    console.log(`======================================================`);

    try {
      const res = await axios.post(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phone,
        type: 'template',
        template: {
          name: 'admin_operations_alert_v1',
          language: { code: 'en_US' },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: 'TEST ALERT DISPATCH' },
              { type: 'text', text: `Sent to ${phone}` },
              { type: 'text', text: 'HIGH' },
              { type: 'text', text: 'Please check your WhatsApp app right now!' }
            ]
          }]
        }
      }, { headers: { Authorization: `Bearer ${token}` } });

      console.log(`✅ Result for ${phone}: Accepted! Message ID: ${res.data.messages[0].id}`);
    } catch (err) {
      console.error(`❌ Error for ${phone}:`, err.response?.data || err.message);
    }
  }
}

testRecipients();
