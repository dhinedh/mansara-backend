// test_meta_api_debug.js
require('dotenv').config();
const axios = require('axios');

async function debugMetaApi() {
  const token = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.META_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;
  const adminPhone = process.env.ADMIN_PHONE || '919342400879';

  console.log('--- META API DIAGNOSTIC LOG ---');
  console.log('Phone ID:', phoneId);
  console.log('Token (first 15 chars):', token ? token.slice(0, 15) + '...' : 'MISSING');
  console.log('Target Phone:', adminPhone);

  const targets = ['919342400879', '9342400879', '+919342400879'];

  for (const toPhone of targets) {
    console.log(`\nTesting payload to: ${toPhone}`);
    try {
      const res = await axios({
        method: 'POST',
        url: `https://graph.facebook.com/v20.0/${phoneId}/messages`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: toPhone,
          type: 'template',
          template: {
            name: 'admin_operations_alert_v1',
            language: { code: 'en_US' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: 'TEST ALERT DEBUG' },
                  { type: 'text', text: 'Direct Test to ' + toPhone },
                  { type: 'text', text: 'HIGH' },
                  { type: 'text', text: 'Checking delivery status on WhatsApp' }
                ]
              }
            ]
          }
        }
      });
      console.log(`✅ Success Response for ${toPhone}:`, JSON.stringify(res.data, null, 2));
    } catch (err) {
      console.error(`❌ Error Response for ${toPhone}:`, err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    }
  }
}

debugMetaApi();
