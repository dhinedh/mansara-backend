require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');

const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
const WABA_IDS = ['1379129324117602'];

const masterTemplates = [
  // 1. Dealer Stock Request Created
  {
    name: 'dealer_stock_request_created_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '📦 *Stock Request Submitted!*\n\nNamaste *{{1}}*, your stock request *#{{2}}* has been created successfully.\n\n📋 *Request Summary:*\n• *Request ID:* #{{2}}\n• *Items Count:* {{3}} items\n• *Estimated Value:* ₹{{4}}\n\n⏳ *Status:* PENDING ALLOCATION\n\nTrack Request: https://crm.mansarafoods.com/requests/{{2}}\n\nThank you for partnering with *Mansara Foods*! 🌿',
        example: {
          body_text: [['Rajesh Kumar', 'REQ-8841', '12', '45,000']]
        }
      }
    ]
  },
  // 2. Dealer Stock Request Dispatched
  {
    name: 'dealer_stock_request_dispatched_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '🚚 *Stock Request Dispatched!* 📦\n\nNamaste *{{1}}*, stock request *#{{2}}* is in-transit to your store/warehouse!\n\n📋 *Shipment Details:*\n• *Courier / Vehicle:* {{3}}\n• *AWB / Tracking:* {{4}}\n• *Expected Delivery:* {{5}}\n\n🌐 Track: https://crm.mansarafoods.com/requests/{{2}}\n\nPlease inspect package upon delivery. Thank you! 🙏',
        example: {
          body_text: [['Rajesh Kumar', 'REQ-8841', 'iCarry Express', 'TRK99823', '04-Sep-2026']]
        }
      }
    ]
  },
  // 3. Dealer Stock Request Delivered
  {
    name: 'dealer_stock_request_delivered_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '✅ *Stock Request Delivered!*\n\nNamaste *{{1}}*, stock request *#{{2}}* has been marked DELIVERED.\n\n📋 *Order ID:* #{{2}}\n📅 *Delivered Date:* {{3}}\n\nPlease verify stock quantities and report any damages in CRM within 24 hours.\n\nThank you for choosing *Mansara Foods*! 🌿',
        example: {
          body_text: [['Rajesh Kumar', 'REQ-8841', '02-Sep-2026']]
        }
      }
    ]
  },
  // 4. B2B Tax Invoice Generated
  {
    name: 'dealer_tax_invoice_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '📄 *B2B Tax Invoice Generated*\n\nNamaste *{{1}}*, Tax Invoice *#{{2}}* has been generated for stock request *#{{3}}*.\n\n💰 *Total Payable:* ₹{{4}}\n📅 *Due Date:* {{5}}\n\n📄 Download PDF Invoice: {{6}}\n\nThank you for your business! 🙏',
        example: {
          body_text: [['Rajesh Kumar', 'INV-2026-091', 'REQ-8841', '48,500', '15-Sep-2026', 'https://crm.mansarafoods.com/invoices/INV-2026-091.pdf']]
        }
      }
    ]
  },
  // 5. Payment Due Reminder
  {
    name: 'dealer_payment_reminder_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '⏳ *Payment Due Reminder*\n\nNamaste *{{1}}*, friendly reminder that Tax Invoice *#{{2}}* for ₹{{3}} is due on *{{4}}*.\n\n💳 Pay Online / View Balance:\nhttps://crm.mansarafoods.com/pay/{{2}}\n\nTimely payments keep your credit line active. Thank you! 🌿',
        example: {
          body_text: [['Rajesh Kumar', 'INV-2026-091', '48,500', '15-Sep-2026']]
        }
      }
    ]
  },
  // 6. Overdue Payment Alert
  {
    name: 'dealer_overdue_warning_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '⚠️ *URGENT: Overdue Payment Alert*\n\nNamaste *{{1}}*, Invoice *#{{2}}* for ₹{{3}} is OVERDUE (Due Date: {{4}}).\n\n⛔ *Notice:* New stock requests will be held automatically until payment is cleared.\n\n💳 Pay Now: https://crm.mansarafoods.com/pay/{{2}}\n\nThank you for your prompt attention! 🙏',
        example: {
          body_text: [['Rajesh Kumar', 'INV-2026-091', '48,500', '01-Sep-2026']]
        }
      }
    ]
  },
  // 7. Payment Receipt Confirmation
  {
    name: 'dealer_payment_receipt_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '✅ *Payment Received & Confirmed!*\n\nNamaste *{{1}}*, we have received your payment of *₹{{2}}* for Invoice *#{{3}}*.\n\n📋 *Payment Details:*\n• *Payment Mode:* {{4}} (UTR/Ref: {{5}})\n• *Remaining Outstanding:* ₹{{6}}\n• *Credit Status:* Active / Unlocked\n\nThank you for your payment! 🌿',
        example: {
          body_text: [['Rajesh Kumar', '48,500', 'INV-2026-091', 'NEFT', 'UTR88716253', '0']]
        }
      }
    ]
  },
  // 8. Credit Limit & Margin Percentage Update
  {
    name: 'dealer_margin_credit_update_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '📊 *Account Credit & Margin Updated*\n\nNamaste *{{1}}*, your dealer account parameters have been updated by Mansara Administration:\n\n• *Partner Tier:* {{2}}\n• *Default Margin:* {{3}}%\n• *Credit Limit:* ₹{{4}}\n\nPortal Login: https://crm.mansarafoods.com/login\n\nThank you for growing with *Mansara Foods*! 🌿',
        example: {
          body_text: [['Rajesh Kumar', 'GOLD PARTNER', '15', '200,000']]
        }
      }
    ]
  },
  // 9. Stock Return Status / Credit Note Issued
  {
    name: 'dealer_credit_note_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '📑 *Credit Note Issued*\n\nNamaste *{{1}}*, Credit Note *#{{2}}* for ₹{{3}} has been issued against Return Claim *#{{4}}*.\n\n💰 *Balance:* ₹{{3}} has been credited to your dealer ledger.\n\nView Ledger: https://crm.mansarafoods.com/ledger\n\nThank you! 🙏',
        example: {
          body_text: [['Rajesh Kumar', 'CN-2026-004', '3,200', 'CLM-9012']]
        }
      }
    ]
  },
  // 10. Support Ticket Agent Reply / Resolution
  {
    name: 'dealer_ticket_update_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '💬 *Support Ticket Update*\n\nNamaste *{{1}}*, support ticket *#{{2}}* (Subject: {{3}}) has been updated.\n\n📌 *Status:* {{4}}\n💬 *Agent Response:* "{{5}}"\n\nView Ticket: https://crm.mansarafoods.com/tickets/{{2}}\n\nThank you for reaching out to *Mansara Foods*! 🌿',
        example: {
          body_text: [['Rajesh Kumar', 'TCK-401', 'Damaged Packaging Claim', 'RESOLVED', 'Credit note CN-2026-004 has been issued for the damaged units.']]
        }
      }
    ]
  },
  // 11. New Product Launch & Promotional Scheme Alert
  {
    name: 'dealer_promotional_scheme_v1',
    category: 'MARKETING',
    language: 'en_US',
    components: [

      {
        type: 'BODY',
        text: '🎉 *Special Scheme & Offer Announcement!* 🌿\n\nNamaste *{{1}}*, *Mansara Foods* is excited to announce a new offer for our valued partners!\n\n📢 *Scheme Details:*\n*{{2}}*\n\n🛍️ *Offer Code / Discount:* {{3}}\n📅 *Valid Until:* {{4}}\n\nOrder Wholesale: https://crm.mansarafoods.com/products\n\nHappy Selling! 🚀',
        example: {
          body_text: [['Rajesh Kumar', 'Buy 50 Packs of Ragi Choco Malt & Get 10% Extra Margin!', 'SCHEME10', '15-Sep-2026']]
        }
      }
    ]
  },
  // 12. Admin Operations Alert
  {
    name: 'admin_operations_alert_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '🚨 *MANSARA OPERATIONS ALERT: {{1}}*\n\n• *Target Entity / User:* {{2}}\n• *Priority Level:* {{3}}\n• *Event Details:* {{4}}\n\n⚡ Admin Dashboard: https://crm.mansarafoods.com/admin',
        example: {
          body_text: [['New Dealer Registration', 'Apex Supermarket', 'HIGH', 'New dealer registered with GSTIN 27AABCM9981. Approval required.']]
        }
      }
    ]
  },
  // 13. Salesman Lead Assigned
  {
    name: 'salesman_lead_assigned_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '🎯 *NEW B2B LEAD ASSIGNED*\n\nHi *{{1}}*, a new prospect store has been assigned to your territory!\n\n🏢 *Store:* {{2}}\n👤 *Contact:* {{3}}\n📞 *Phone:* {{4}}\n📍 *Area:* {{5}}\n\nPlease schedule a visit today! 🚀',
        example: {
          body_text: [['Suresh Salesman', 'Green Organics Store', 'Ramesh Shah', '9876543210', 'T Nagar, Chennai']]
        }
      }
    ]
  },
  // 14. Salesman Daily Schedule
  {
    name: 'salesman_daily_schedule_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '🌅 *Good Morning {{1}}! Your Daily Field Plan* 📋\n\nToday you have *{{2}}* store visits scheduled in your area.\n\n💰 *Pending Payment Collections:* ₹{{3}}\n\nPlease log check-ins in the mobile app! 🚀\nhttps://crm.mansarafoods.com/app',
        example: {
          body_text: [['Suresh Salesman', '8', '24,500']]
        }
      }
    ]
  },
  // 15. B2C Order Confirmed
  {
    name: 'b2c_order_confirmed_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '✅ *ORDER CONFIRMED!* 🌿\n\nHi *{{1}}*, great news! Your order *#{{2}}* is confirmed and processing!\n\n🚚 *Expected Delivery:* {{3}}\n💰 *Total Amount:* ₹{{4}}\n\n📦 Track Order: https://mansarafoods.com/order-tracking/{{2}}\n\nThank you for choosing *Mansara Foods*! 🙏',
        example: {
          body_text: [['Ananya Sharma', 'ORD-10992', 'Friday, 04 September 2026', '1,450']]
        }
      }
    ]
  },
  // 16. B2C Review Request
  {
    name: 'b2c_review_request_v1',
    category: 'UTILITY',
    language: 'en_US',
    components: [
      {
        type: 'BODY',
        text: '⭐ *How was your order with Mansara Foods?*\n\nHi *{{1}}*, your order *#{{2}}* was delivered! We hope you love your products! 🌿\n\nPlease take a moment to rate and review your purchase:\n📝 Review Link: https://mansarafoods.com/account/orders\n\nThank you for your support! 🙏',
        example: {
          body_text: [['Ananya Sharma', 'ORD-10992']]
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

  console.log(`🚀 Submitting ${masterTemplates.length} Meta Utility templates to Graph API...`);

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
        console.log(`❌ Template "${template.name}" response:`, typeof errorDetails === 'object' ? JSON.stringify(errorDetails, null, 2) : errorDetails);
      }
    }
  }

  console.log('\n✅ Meta Template Synchronization Finished!');
}

syncAllTemplates();
