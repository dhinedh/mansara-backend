require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
const WABA_IDS = ['1379129324117602'];

const masterTemplates = [
  // Premium Formatted Order Shipping Update Template (v2)
  {
    name: 'order_shipping_update_v2',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '🚚 *Order Dispatched & In-Transit!* 📦\n\nNamaste *{{1}}*, your order *{{2}}* has been packed and handed over to our courier partner!\n\n📋 *Shipment Details:*\n• *Order ID:* {{2}}\n• *Courier Partner:* {{3}}\n• *Tracking AWB:* {{4}}\n\n🌐 *Track Live Location:* https://mansarafoods.com/order-tracking\n\nThank you for choosing *Mansara Foods* for your healthy traditional staples! 🙏',
        example: {
          body_text: [
            ['Valued Customer', 'ORD-10024', 'iCarry Express', 'TRACK987654']
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

  console.log('🚀 Submitting rich formatted template "order_shipping_update_v2" to Meta Graph API...');

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
