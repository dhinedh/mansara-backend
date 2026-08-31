require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
const WABA_IDS = ['1379129324117602'];

const templatesToSubmit = [
  {
    name: 'mansara_auth_code',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: 'Welcome to Mansara Foods. Your account verification code is {{1}}. Please enter this code within {{2}} minutes to complete verification. Thank you for choosing us.',
        example: {
          body_text: [
            ['584920', '10']
          ]
        }
      }
    ]
  }
];

async function submitMetaTemplates() {
  if (!META_ACCESS_TOKEN) {
    console.error('❌ Error: META_ACCESS_TOKEN is missing in .env file.');
    process.exit(1);
  }

  console.log('🚀 Submitting "mansara_auth_code" template to Meta Graph API...');

  for (const wabaId of WABA_IDS) {
    console.log(`\n📌 Target WABA ID: ${wabaId}`);

    for (const template of templatesToSubmit) {
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
        console.error(`❌ Template "${template.name}" (${template.language}) response:`, JSON.stringify(errorDetails, null, 2));
      }
    }
  }

  console.log('\n✅ Meta Template Creation Script Finished!');
}

submitMetaTemplates();
