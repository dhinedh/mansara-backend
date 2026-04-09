require('dotenv').config();
const axios = require('axios');

async function testParam(paramName) {
    const apiKey = process.env.BOTBIZ_API_KEY;
    const phoneId = process.env.BOTBIZ_PHONE_ID;
    const baseUrl = 'https://dash.botbiz.io/api/v1/whatsapp/send';

    const testPhone = '918838887064';
    const body = {
        apiToken: apiKey,
        phone_number: testPhone,
        message: 'Hello'
    };
    body[paramName] = phoneId;

    console.log(`\n--- Testing Param: ${paramName} ---`);
    try {
        const response = await axios.post(baseUrl, body, {
            headers: { 'Accept': 'application/json' }
        });
        console.log('SUCCESS!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response) {
            console.log(`FAILED with Status ${error.response.status}`);
            console.log('Data:', JSON.stringify(error.response.data, null, 2).substring(0, 200));
        } else {
            console.log('ERROR:', error.message);
        }
    }
}

async function run() {
    await testParam('phoneNumberID');
    await testParam('phone_number_id');
    await testParam('sender_phone_number_id');
    await testParam('whatsapp_phone_number_id');
    await testParam('_id');
}

run();
