const axios = require('axios');
require('dotenv').config({ path: '.env' });

const WHAPI_URL = 'https://gate.whapi.cloud';
const WHAPI_TOKEN = process.env.WHAPI_TOKEN;

async function checkStatus() {
    console.log('MONGODB_URI:', process.env.MONGODB_URI);
    console.log('Checking Whapi Connection Status...');
    console.log('Token:', WHAPI_TOKEN ? 'Found' : 'Missing');

    try {
        // Try to get user profile/status
        const response = await axios.get(`${WHAPI_URL}/users/profile`, {
            headers: {
                'Authorization': `Bearer ${WHAPI_TOKEN}`
            }
        });

        console.log('\n✅ Connection Successful!');
        console.log('--------------------------------');
        console.log('Full Response:', JSON.stringify(response.data, null, 2));
        console.log('--------------------------------');

    } catch (error) {
        console.error('\n❌ Connection Failed');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

checkStatus();
