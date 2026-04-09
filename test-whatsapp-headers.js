require('dotenv').config();
const axios = require('axios');

async function testHeader(headerName, isBearer = false) {
    const apiKey = process.env.BOTBIZ_API_KEY;
    const phoneId = process.env.BOTBIZ_PHONE_ID;
    const baseUrl = 'https://dash.botbiz.io/api/v1/whatsapp/send';

    const testPhone = '918838887064';
    const testMessage = `Testing header: ${headerName}`;

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    if (isBearer) {
        headers[headerName] = `Bearer ${apiKey}`;
    } else {
        headers[headerName] = apiKey;
    }

    console.log(`\n--- Testing Header: ${headerName} ---`);
    try {
        const response = await axios.post(baseUrl, {
            phoneNumberID: phoneId,
            phone_number: testPhone,
            message: testMessage
        }, { headers, maxRedirects: 0 }); // Disable redirects to see actual status

        console.log('SUCCESS!');
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response) {
            console.log(`FAILED with Status ${error.response.status}`);
            console.log('Message:', error.response.data.message || error.response.data);
        } else {
            console.log('ERROR:', error.message);
        }
    }
}

async function runAll() {
    await testHeader('apiToken');
    await testHeader('api-token');
    await testHeader('x-api-token');
    await testHeader('Authorization', true);
}

runAll();
