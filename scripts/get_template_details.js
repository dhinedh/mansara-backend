// scripts/get_template_details.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const TOKEN = process.env.META_ACCESS_TOKEN;
const WABA_ID = '1379129324117602';

async function checkTemplates() {
  console.log(`🔍 Checking approval status of all WhatsApp Message Templates under WABA ID: ${WABA_ID}...`);

  try {
    const res = await axios.get(
      `https://graph.facebook.com/v20.0/${WABA_ID}/message_templates`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );

    console.log('📋 Message Templates:');
    (res.data.data || []).forEach(t => {
      console.log(`• Name: ${t.name} | Status: ${t.status} | Category: ${t.category} | Language: ${t.language}`);
    });
  } catch (err) {
    console.error('❌ Error fetching templates:', err.response?.data || err.message);
  }
}

checkTemplates();
