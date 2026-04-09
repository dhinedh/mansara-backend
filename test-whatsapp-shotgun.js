require('dotenv').config();
const axios = require('axios');

async function testCombination(label, body) {
    const baseUrl = 'https://dash.botbiz.io/api/v1/whatsapp/send';
    console.log(`\n--- ${label} ---`);
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
    const fullKey = process.env.BOTBIZ_API_KEY;
    const phoneId = process.env.BOTBIZ_PHONE_ID;
    const userId = fullKey.split('|')[0];
    const tokenPart = fullKey.split('|')[1];
    const testPhone = '918838887064';

    // 1. Full key in body as apiToken + user_id
    await testCombination('Full Key + user_id', {
        apiToken: fullKey,
        user_id: userId,
        phoneNumberID: phoneId,
        phone_number: testPhone,
        message: 'Test 1'
    });

    // 2. Token part only as apiToken + user_id
    await testCombination('Token Part + user_id', {
        apiToken: tokenPart,
        user_id: userId,
        phoneNumberID: phoneId,
        phone_number: testPhone,
        message: 'Test 2'
    });

    // 3. full key as api_token (snake case)
    await testCombination('api_token (snake case)', {
        api_token: fullKey,
        phoneNumberID: phoneId,
        phone_number: testPhone,
        message: 'Test 3'
    });

    // 4. apiToken in query, other stuff in body
    console.log('\n--- apiToken in Query ---');
    try {
        const response = await axios.post(`${baseUrl}?apiToken=${fullKey}`, {
            phoneNumberID: phoneId,
            phone_number: testPhone,
            message: 'Test 4'
        });
        console.log('SUCCESS!');
    } catch (err) {
        console.log('FAILED again');
    }
}

run();
