const axios = require('axios');
const dotenv = require('dotenv');
const qs = require('querystring');
dotenv.config();

const API_KEY = process.env.ICARRY_API_KEY;
const USERNAME = process.env.ICARRY_USERNAME;

async function testShipment() {
    try {
        const loginRes = await axios.post('https://www.icarry.in/api_login', qs.stringify({
            username: USERNAME,
            Key: API_KEY
        }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        const token = loginRes.data.api_token;
        if (!token) return;

        const url = `https://www.icarry.in/api_add_shipment_surface?api_token=${token}`;
        const payload = {
            username: USERNAME,
            order_id: 'T' + Date.now(),
            order_date: new Date().toISOString().split('T')[0],
            consignee_name: 'Test',
            consignee_address: 'Test',
            consignee_city: 'Chennai',
            consignee_state: 'Tamil Nadu',
            consignee_country: 'India',
            consignee_pincode: '600001',
            consignee_mobile: '9876543210',
            consignee_email: 'test@test.com',
            parcel_type: 'P',
            parcel_value: 100,
            parcel_contents: 'Test',
            weight: 500,
            weight_unit: 'gm',
            pickup_address: 'Mansara',
            pickup_pincode: '600001',
            length: 10,
            breadth: 10,
            height: 5,
            package_type: 'Parcel'
        };

        const res = await axios.post(url, qs.stringify(payload), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        console.log('FULL_RESPONSE:', JSON.stringify(res.data));

    } catch (error) {
        console.log('FULL_ERROR:', JSON.stringify(error.response?.data || error.message));
    }
}

testShipment();
