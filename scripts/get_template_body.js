// scripts/get_template_body.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const TOKEN = process.env.META_ACCESS_TOKEN;
const WABA_ID = '1379129324117602';

async function checkBody() {
  try {
    const res = await axios.get(
      `https://graph.facebook.com/v20.0/${WABA_ID}/message_templates`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }
    );

    res.data.data.forEach(t => {
      console.log(`\n========================================`);
      console.log(`Template: ${t.name} (${t.status})`);
      console.log(`Components:`, JSON.stringify(t.components, null, 2));
    });
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

checkBody();
