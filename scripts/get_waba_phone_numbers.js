// scripts/get_waba_phone_numbers.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
const WABA_IDS = ['1379129324117602', '1346831177600259', '1728640724897700', '848541661628434'];

async function fetchPhoneNumbers() {
  if (!META_ACCESS_TOKEN) {
    console.error('❌ Missing META_ACCESS_TOKEN');
    process.exit(1);
  }

  console.log('🔍 Fetching all Phone Number IDs registered under Meta WABA Accounts...');

  for (const wabaId of WABA_IDS) {
    console.log(`\n📌 Checking WABA Account ID: ${wabaId}`);
    try {
      const res = await axios.get(
        `https://graph.facebook.com/v20.0/${wabaId}/phone_numbers`,
        {
          headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` }
        }
      );
      console.log(`✅ Phone Numbers for WABA ${wabaId}:`, JSON.stringify(res.data.data, null, 2));
    } catch (err) {
      console.error(`❌ Error fetching phone numbers for WABA ${wabaId}:`, err.response?.data || err.message);
    }
  }
}

fetchPhoneNumbers();
