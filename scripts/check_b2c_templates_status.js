// scripts/check_b2c_templates_status.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
const WABA_ID = '1379129324117602';

async function checkStatus() {
  try {
    console.log(`Checking Meta WABA Template Status for WABA ID: ${WABA_ID}...`);
    const res = await axios.get(
      `https://graph.facebook.com/v20.0/${WABA_ID}/message_templates?limit=100`,
      { headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}` } }
    );

    console.log(`\nFound ${res.data.data?.length || 0} Total Templates on WABA:`);
    (res.data.data || []).forEach(t => {
      console.log(`📌 Name: "${t.name}" | Status: ${t.status} | Category: ${t.category} | Lang: ${t.language}`);
    });
  } catch (err) {
    console.error('Error fetching template status:', err.response?.data || err.message);
  }
}

checkStatus();
