require('dotenv').config();
const axios = require('axios');

async function testURL(url, label) {
    const apiKey = process.env.BOTBIZ_API_KEY;
    const phoneId = process.env.BOTBIZ_PHONE_ID;
    console.log(`\n--- ${label} ---`);
    try {
        const response = await axios.get(`${url}?apiToken=${apiKey}&phone_number_id=${phoneId}`, {
            headers: { 'Accept': 'application/json' }
        });
        console.log('SUCCESS!');
        console.log('Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response) {
            console.log(`FAILED with Status ${error.response.status}`);
            console.log('Data:', JSON.stringify(error.response.data, null, 2).substring(0, 100));
        } else {
            console.log('ERROR:', error.message);
        }
    }
}

async function run() {
    // Try singular subscriber/list
    await testURL('https://dash.botbiz.io/api/v1/whatsapp/subscriber/list', 'dash.botbiz.io (singular subscriber)');
    // Try api.botbiz.io
    await testURL('https://api.botbiz.io/api/v1/whatsapp/subscriber/list', 'api.botbiz.io');
}

run();
