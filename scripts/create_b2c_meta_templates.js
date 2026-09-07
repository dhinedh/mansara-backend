// scripts/create_b2c_meta_templates.js
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
const WABA_IDS = ['1379129324117602'];

const templatesToCreate = [
  {
    name: 'order_shipped_utility',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Namaste {{1}}, your Mansara Foods order #{{2}} has been shipped! Courier: {{3}}, Tracking AWB: {{4}}. Track live: {{5}}. Thank you for choosing healthy organic foods!',
        example: {
          body_text: [
            ['Valued Customer', 'ORD-1025', 'iCarry Express', 'AWB987654321', 'https://mansarafoods.com/order-tracking/ORD-1025']
          ]
        }
      }
    ]
  },
  {
    name: 'cart_recovery_v2',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Namaste {{1}}, you left {{2}} in your Mansara Foods cart! Complete your purchase now and enjoy pure traditional goodness. Resume checkout at link {{3}} to complete your order today. Thank you!',
        example: {
          body_text: [
            ['Valued Customer', 'Ragi Choco Malt', 'https://mansarafoods.com/checkout']
          ]
        }
      }
    ]
  },
  {
    name: 'review_request_utility',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Namaste {{1}}, hope you enjoyed your Mansara Foods order #{{2}}! Please take a moment to rate & review your purchase: {{3}}. Your feedback helps us serve you better!',
        example: {
          body_text: [
            ['Valued Customer', 'ORD-1025', 'https://mansarafoods.com/account/orders']
          ]
        }
      }
    ]
  },
  {
    name: 'order_status_utility',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Namaste {{1}}, your order #{{2}} status has been updated to: {{3}}. {{4}} Thank you for choosing Mansara Foods!',
        example: {
          body_text: [
            ['Valued Customer', 'ORD-1025', 'Confirmed & Processing', 'Expected delivery in 3-4 days. Track: https://mansarafoods.com/order-tracking/ORD-1025']
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

  console.log('🚀 Submitting B2C Utility Templates to Meta Graph API WABA...');

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

  console.log('\n✅ B2C Template Submission Finished!');
}

createTemplates();
