require('dotenv').config();
const { srRequest } = require('./services/shiprocket');
(async () => {
    try {
        const orderPayload = {
            order_id: "TEST_" + Date.now(),
            order_date: new Date().toISOString().split('T')[0],
            pickup_location: "work",
            billing_customer_name: "Test",
            billing_last_name: "User",
            billing_address: "123 Test St",
            billing_city: "Chennai",
            billing_pincode: "600001",
            billing_state: "Tamil Nadu",
            billing_country: "India",
            billing_email: "test@example.com",
            billing_phone: "9876543210",
            shipping_is_billing: true,
            order_items: [{
                name: "Test Item",
                sku: "TEST-SKU",
                units: 1,
                selling_price: 100
            }],
            payment_method: "Prepaid",
            sub_total: 100,
            length: 10,
            breadth: 10,
            height: 10,
            weight: 0.5
        };
        const srOrder = await srRequest('POST', '/orders/create/adhoc', orderPayload);
        console.log('Order Response:', JSON.stringify(srOrder, null, 2));
        
        const serviceability = await srRequest('GET', `/courier/serviceability?pickup_pincode=600077&delivery_pincode=600001&weight=0.5&cod=0`);
        console.log('Serviceability Response:', JSON.stringify(serviceability, null, 2));
    } catch (e) {
        console.error(e);
    }
})();
