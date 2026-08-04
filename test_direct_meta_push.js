// test_direct_meta_push.js
require('dotenv').config();
const axios = require('axios');

const TOKEN = process.env.META_ACCESS_TOKEN;
const PHONE_ID = '1234259863105295';
const TARGET = '919342400879';

async function sendTest() {
  console.log(`🚀 Sending Meta 'hello_world' Utility Template directly from +91 79045 07105 (Phone ID: ${PHONE_ID}) to ${TARGET}...`);

  try {
    const res = await axios({
      method: 'POST',
      url: `https://graph.facebook.com/v20.0/${PHONE_ID}/messages`,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      data: {
        messaging_product: 'whatsapp',
        to: TARGET,
        type: 'template',
        template: {
          name: 'hello_world',
          language: { code: 'en_US' }
        }
      }
    });

    console.log('✅ Meta API Delivery Response:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('❌ Delivery Error:', err.response?.data || err.message);
  }
}

sendTest();
