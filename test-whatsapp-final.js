require('dotenv').config();
const axios = require('axios');

async function testFinal() {
    console.log('--- BOTBIZ FINAL SHOTGUN ---');
    const apiKey = process.env.BOTBIZ_API_KEY;
    const phoneId = process.env.BOTBIZ_PHONE_ID;
    const testPhone = '918838887064';

    const scenarios = [
        {
            url: 'https://dash.botbiz.io/api/v1/whatsapp/messages/send',
            body: { apiToken: apiKey, phone_number_id: phoneId, phone_number: testPhone, message: 'Test' }
        },
        {
            url: 'https://dash.botbiz.io/api/v1/whatsapp/send',
            headers: { 'apiToken': apiKey },
            body: { phoneNumberID: phoneId, phone_number: testPhone, message: 'Test' }
        },
        {
            url: 'https://dash.botbiz.io/api/v1/whatsapp/send',
            headers: { 'api-token': apiKey },
            body: { phoneNumberID: phoneId, phone_number: testPhone, message: 'Test' }
        }
    ];

    for (const s of scenarios) {
        console.log(`\nTesting ${s.url}...`);
        try {
            const response = await axios.post(s.url, s.body, { headers: s.headers });
            console.log('SUCCESS!');
            console.log('Response:', response.data);
        } catch (err) {
            console.log(`FAILED with Status ${err.response?.status}`);
            console.log('Data:', JSON.stringify(err.response?.data).substring(0, 100));
        }
    }
}

testFinal();
