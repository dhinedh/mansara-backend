const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testProducts() {
    console.log('Testing GET /products...');
    const start = Date.now();
    try {
        const res = await axios.get(`${API_URL}/products?limit=10`);
        const duration = Date.now() - start;
        console.log(`✅ Success! Status: ${res.status}`);
        console.log(`⏱️ Duration: ${duration}ms`);
        console.log(`📦 Data: ${res.data.products?.length} products`);
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
    }
}

testProducts();
