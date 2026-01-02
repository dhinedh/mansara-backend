const axios = require('axios');
require('dotenv').config();

const testWhapiConnection = async () => {
    const instance = process.env.WHAPI_INSTANCE;
    const token = process.env.WHAPI_TOKEN;

    console.log('=== Whapi.Cloud Connection Test ===\n');
    console.log(`Instance: ${instance}`);
    console.log(`Token: ${token ? token.substring(0, 10) + '...' : 'NOT SET'}\n`);

    // Test different API endpoints
    const testEndpoints = [
        {
            name: 'Health Check',
            method: 'GET',
            url: 'https://gate.whapi.cloud/health'
        },
        {
            name: 'Settings (No Auth)',
            method: 'GET',
            url: 'https://gate.whapi.cloud/settings'
        },
        {
            name: 'Settings (With Instance)',
            method: 'GET',
            url: `https://gate.whapi.cloud/${instance}/settings`
        },
        {
            name: 'Instance Specific',
            method: 'GET',
            url: `https://${instance}.whapi.cloud/settings`
        }
    ];

    for (const endpoint of testEndpoints) {
        try {
            console.log(`Testing: ${endpoint.name}`);
            console.log(`URL: ${endpoint.url}`);

            const config = {
                method: endpoint.method,
                url: endpoint.url,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                },
                timeout: 10000
            };

            const response = await axios(config);
            console.log(`✅ SUCCESS - Status: ${response.status}`);
            console.log('Response:', JSON.stringify(response.data, null, 2));
            console.log('\n---\n');

        } catch (error) {
            console.log(`❌ FAILED - Status: ${error.response?.status || 'NO RESPONSE'}`);
            console.log('Error:', error.response?.data || error.message);
            console.log('\n---\n');
        }
    }

    // Try sending a test message
    console.log('Testing Message Send...\n');
    const testNumber = '919342400879';
    const messagePayload = {
        to: `${testNumber}@c.us`,
        body: 'Test from Mansara Foods - Whapi.Cloud'
    };

    const messageEndpoints = [
        'https://gate.whapi.cloud/messages/text',
        `https://gate.whapi.cloud/${instance}/messages/text`,
        `https://${instance}.whapi.cloud/messages/text`
    ];

    for (const url of messageEndpoints) {
        try {
            console.log(`Trying: ${url}`);

            const response = await axios.post(url, messagePayload, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 15000
            });

            console.log(`✅ MESSAGE SENT - Status: ${response.status}`);
            console.log('Response:', JSON.stringify(response.data, null, 2));
            console.log('\n=== TEST COMPLETE ===');
            return;

        } catch (error) {
            console.log(`❌ FAILED - Status: ${error.response?.status || 'NO RESPONSE'}`);
            console.log('Error:', error.response?.data || error.message);
            console.log('\n---\n');
        }
    }

    console.log('\n=== ALL TESTS FAILED ===');
};

testWhapiConnection();