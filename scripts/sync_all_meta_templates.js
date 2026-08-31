require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
const WABA_IDS = ['1379129324117602'];

const masterTemplates = [
  // 1. Dealer Approval Notification (Fixed body parameter placement)
  {
    name: 'dealer_partner_approval_v2',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, your B2B dealer account for {{2}} has been approved. Registered email: {{3}}. Account tier: {{4}}. Login to your portal at https://crm.mansarafoods.com/login to access your account. Thank you for partnering with Mansara Foods.',
        example: {
          body_text: [
            ['Himesh Priyan', 'Himesh Priyan Traders', 'himesh@example.com', 'STARTER (10% Margin)']
          ]
        }
      }
    ]
  },
  // 2. Official Authentication OTP Template (Standard Meta Authentication Format)
  {
    name: 'mansara_login_otp',
    category: 'AUTHENTICATION',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        add_security_recommendation: true
      },
      {
        type: 'FOOTER',
        code_expiration_minutes: 10
      },
      {
        type: 'BUTTONS',
        buttons: [
          {
            type: 'OTP',
            otp_type: 'COPY_CODE',
            text: 'Copy Code'
          }
        ]
      }
    ]
  }
];

async function syncAllTemplates() {
  if (!META_ACCESS_TOKEN) {
    console.error('❌ Error: META_ACCESS_TOKEN is missing in .env file.');
    process.exit(1);
  }

  console.log('🚀 Submitting AUTHENTICATION and Dealer Approval templates to Meta Graph API...');

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
