// scripts/debug_meta_direct.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const TOKEN = process.env.META_ACCESS_TOKEN;
const PHONE_ID = '1234259863105295';
const TARGET = '919342400879';

async function debugMeta() {
  console.log(`🔍 Inspecting Meta Cloud API connection for Phone ID: ${PHONE_ID} to Target: ${TARGET}...`);

  // 1. Check Phone Number details
  try {
    const phoneRes = await axios.get(`https://graph.facebook.com/v20.0/${PHONE_ID}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    console.log('📌 Sender Phone Details:', JSON.stringify(phoneRes.data, null, 2));
  } catch (e) {
    console.error('❌ Error fetching sender details:', e.response?.data || e.message);
  }

  // 2. Send order_status_utility
  try {
    console.log('\n🚀 Sending order_status_utility template...');
    const res = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: TARGET,
        type: 'template',
        template: {
          name: 'order_status_utility',
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: 'Mansara Customer' },
                { type: 'text', text: 'ORD-9999' },
                { type: 'text', text: 'Confirmed' },
                { type: 'text', text: 'Total: RS 500' }
              ]
            }
          ]
        }
      }
    });

    console.log('✅ Meta Response:', JSON.stringify(res.data, null, 2));
  } catch (e) {
    console.error('❌ Meta Delivery Error:', JSON.stringify(e.response?.data || e.message, null, 2));
  }
}

debugMeta();
