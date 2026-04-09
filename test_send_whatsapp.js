require('dotenv').config();
const whatsappService = require('./utils/WhatsAppService');

async function testWhatsApp() {
    const testPhone = '9342400879';
    const testMessage = `*Mansara Foods Test Order* 🌿\n\nThis is a test notification for your order. \n🚚 Status: Being Processed\n\nThank you for choosing Mansara! 🙏`;

    console.log(`Sending test message to ${testPhone}...`);
    try {
        const result = await whatsappService.sendMessage(testPhone, testMessage);
        console.log('SUCCESS!');
        console.log('Response:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('FAILED!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testWhatsApp();
