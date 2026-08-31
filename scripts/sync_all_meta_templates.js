require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
const WABA_IDS = ['1379129324117602'];

// Comprehensive master list of all templates across Mansara Foods ecosystem
const masterTemplates = [
  {
    name: 'dealer_approval_notification',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, your B2B dealer partner account for {{2}} has been approved. Account email: {{3}}. Access details: {{4}}. Thank you for partnering with Mansara Foods.',
        example: {
          body_text: [
            ['Himesh Priyan', 'Himesh Priyan Traders', 'himesh@example.com', 'Tier STARTER (10% Margin) | Portal https://crm.mansarafoods.com']
          ]
        }
      }
    ]
  },
  {
    name: 'payment_reminder_utility',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Hello {{1}}, this is a payment reminder for invoice {{2}} with total amount {{3}}. Payment due date is {{4}}. Thank you for choosing Mansara Foods.',
        example: {
          body_text: [
            ['Valued Partner', 'INV-2026-08', 'Rs 15000', '2026-09-05']
          ]
        }
      }
    ]
  },
  {
    name: 'order_dispatch_alert',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Namaste {{1}}, your order {{2}} has been packed and dispatched via {{3}}. Tracking ID: {{4}}. Track your shipment online anytime. Thank you for choosing Mansara Foods.',
        example: {
          body_text: [
            ['Valued Customer', 'ORD-10024', 'iCarry Express', 'TRACK987654']
          ]
        }
      }
    ]
  },
  {
    name: 'mansara_verification_code',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Welcome to Mansara Foods. Your account verification code is {{1}}. Please enter this code within {{2}} minutes to complete verification. Reference ID: {{3}}. Thank you for choosing us.',
        example: {
          body_text: [
            ['584920', '10', 'AUTH-882']
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

  console.log('🚀 Checking existing Meta templates and submitting missing/updated templates...');

  for (const wabaId of WABA_IDS) {
    console.log(`\n📌 Target WABA ID: ${wabaId}`);

    // Fetch existing templates on Meta WABA
    let existingNames = [];
    try {
      const getRes = await axios.get(
        `https://graph.facebook.com/v20.0/${wabaId}/message_templates`,
        { headers: { Authorization: `Bearer ${META_ACCESS_TOKEN}` } }
      );
      existingNames = (getRes.data.data || []).map(t => `${t.name}:${t.status}`);
      console.log('📋 Existing Meta Templates:', existingNames.join(', '));
    } catch (err) {
      console.warn('⚠️ Could not fetch existing templates:', err.response?.data || err.message);
    }

    for (const template of masterTemplates) {
      try {
        console.log(`⏳ Submitting template "${template.name}" (${template.language})...`);
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
        console.log(`🎉 SUCCESS! Template "${template.name}" (${template.language}) submitted to Meta! ID: ${res.data.id}, Status: ${res.data.status}`);
      } catch (err) {
        const errorDetails = err.response?.data?.error || err.message;
        console.log(`ℹ️ Template "${template.name}" response:`, errorDetails.message || JSON.stringify(errorDetails));
      }
    }
  }

  console.log('\n✅ Meta Template Synchronization Complete!');
}

syncAllTemplates();
