require('dotenv').config();
const axios = require('axios');

async function test() {
    console.log('--- BOTBIZ WHATSAPP-MESSENGER TEST ---');
    const apiKey = process.env.BOTBIZ_API_KEY;
    const phoneId = process.env.BOTBIZ_PHONE_ID;
    const baseUrl = 'https://dash.botbiz.io/api/v1/whatsapp-messenger/send';

    const testPhone = '918838887064';
    const testMessage = 'Messenger endpoint test! 🏷️';

    try {
        console.log(`Testing POST to whatsapp-messenger/send...`);

        const response = await axios.post(`${baseUrl}?apiToken=${apiKey}`, {
            phoneNumberID: phoneId,
            phone_number: testPhone,
            message: testMessage
        });

        console.log('SUCCESS!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
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

test();
