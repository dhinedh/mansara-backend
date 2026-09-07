// scripts/inspect_specific_templates.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
const WABA_ID = '1379129324117602';

async function checkSpecificTemplates() {
  try {
    const res = await axios.get(
      `https://graph.facebook.com/v20.0/${WABA_ID}/message_templates?limit=100`,
      { headers: { 'Authorization': `Bearer ${META_ACCESS_TOKEN}` } }
    );

    const targetNames = ['admin_operations_alert_v1', 'inventory_alert_utility', 'universal_notification', 'sales_team_alert'];
    (res.data.data || []).forEach(t => {
      if (targetNames.includes(t.name)) {
        console.log(`\n📌 Template: "${t.name}" | Status: ${t.status} | Category: ${t.category}`);
        console.log('   Components:', JSON.stringify(t.components, null, 2));
      }
    });
  } catch (err) {
    console.error('Error fetching template details:', err.response?.data || err.message);
  }
}

checkSpecificTemplates();
