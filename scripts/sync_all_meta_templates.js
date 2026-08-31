require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
const WABA_IDS = ['1379129324117602'];

const masterTemplates = [
  // Premium Formatted Dealer Partner Approval Template (v4 - Security compliant)
  {
    name: 'dealer_partner_approval_v4',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '🎉 *B2B Dealer Account Approved!* 🙏\n\nHello *{{1}}*, your dealer partner account for *{{2}}* is now active!\n\n📋 *Account Details:*\n• *Registered Email:* {{3}}\n• *Tier & Access Info:* {{4}}\n\n🌐 *Portal Login:* https://crm.mansarafoods.com/login\n\nLog in to your portal to place stock orders and view partner pricing. Thank you for partnering with *Mansara Foods*!',
        example: {
          body_text: [
            ['Himesh Priyan', 'Himesh Priyan Traders', 'himesh@example.com', 'STARTER Tier (10% Margin)']
          ]
        }
      }
    ]
  }
];

async function syncAllTemplates() {
  if (!META_ACCESS_TOKEN) {
    console.error('❌ Error: META_ACCESS_TOKEN is missing in .env file.');
    process.exit(1);
  }

  console.log('🚀 Submitting security-compliant formatted template "dealer_partner_approval_v4" to Meta Graph API...');

  for (const wabaId of WABA_IDS) {
    console.log(`\n📌 Target WABA ID: ${wabaId}`);

    for (const template of masterTemplates) {
      try {
        console.log(`⏳ Submitting template "${template.name}" (${template.category})...`);
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
        console.log(`🎉 SUCCESS! Template "${template.name}" submitted to Meta! ID: ${res.data.id}, Status: ${res.data.status}`);
      } catch (err) {
        const errorDetails = err.response?.data?.error || err.message;
        console.log(`❌ Template "${template.name}" error:`, JSON.stringify(errorDetails, null, 2));
      }
    }
  }

  console.log('\n✅ Meta Template Synchronization Finished!');
}

syncAllTemplates();
