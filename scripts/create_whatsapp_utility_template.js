// scripts/create_whatsapp_utility_template.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
const WABA_IDS = ['1379129324117602'];

const templatesToCreate = [
  {
    name: 'universal_notification',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Namaste {{1}}, this is an official notification alert regarding {{2}}. Message content: {{3}}. For additional details, please reference {{4}}. Thank you for choosing Mansara Foods!',
        example: {
          body_text: [
            ['Customer Name', 'Order Updates', 'Your order #1024 has been packed', 'mansarafoods.com']
          ]
        }
      }
    ]
  },
  {
    name: 'customer_welcome_utility',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Namaste {{1}}, welcome to Mansara Foods! We are delighted to serve you healthy organic foods. Your registered phone number is {{2}}. Please visit us online at {{3}}. Use promo code {{4}} for special discounts. Thank you!',
        example: {
          body_text: [
            ['Valued Customer', '9876543210', 'mansarafoods.com', 'WELCOME10']
          ]
        }
      }
    ]
  }
];

async function createTemplates() {
  if (!META_ACCESS_TOKEN) {
    console.error('❌ Error: META_ACCESS_TOKEN is missing in .env file.');
    process.exit(1);
  }

  console.log('🚀 Submitting remaining Utility Templates to Meta Graph API...');

  for (const wabaId of WABA_IDS) {
    console.log(`\n📌 Target WABA ID: ${wabaId}`);

    for (const template of templatesToCreate) {
      try {
        console.log(`⏳ Submitting template "${template.name}"...`);
        const res = await axios.post(
          `https://graph.facebook.com/v20.0/${wabaId}/message_templates`,
          template,
          {
            headers: {
              'Authorization': `Bearer ${META_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log(`🎉 SUCCESS! Template "${template.name}" created on WABA ${wabaId}! ID: ${res.data.id}`);
      } catch (err) {
        const errorDetails = err.response?.data?.error || err.message;
        console.error(`❌ Template "${template.name}" response:`, JSON.stringify(errorDetails, null, 2));
      }
    }
  }

  console.log('\n✅ Script Execution Finished!');
}

createTemplates();
