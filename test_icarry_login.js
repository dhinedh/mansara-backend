const axios = require('axios');
const dotenv = require('dotenv');
const qs = require('querystring');
dotenv.config();

const API_KEY = process.env.ICARRY_API_KEY;
const USERNAME = process.env.ICARRY_USERNAME;

async function testLogin() {
    try {
        console.log('Attempting login...');
        const response = await axios.post('https://www.icarry.in/api_login', qs.stringify({
            username: USERNAME,
            Key: API_KEY
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        console.log('Login Response:', response.data);
        return response.data.api_token;
    } catch (error) {
        console.error('Login Error:', error.response?.data || error.message);
    }
}

async function run() {
    const token = await testLogin();
    if (token) {
        console.log('Token acquired:', token);
    }
}

run();
