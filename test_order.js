const http = require('http');

// 1. Get a valid user and product first (Login)
const loginData = JSON.stringify({
    email: 'john.doe@example.com',
    password: 'password123'
});

const loginOptions = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
};

const makeRequest = (options, data) => {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body || '{}') }));
        });
        req.on('error', reject);
        if (data) req.write(data);
        req.end();
    });
};

(async () => {
    try {
        console.log('Logging in...');
        const loginRes = await makeRequest(loginOptions, loginData);
        if (loginRes.status !== 200) throw new Error('Login failed');

        const token = loginRes.body.token;
        const userId = loginRes.body._id;
        console.log('Logged in. Token:', token.substring(0, 10) + '...');

        // 2. Get Products to get a valid ID
        const productsRes = await makeRequest({
            hostname: 'localhost',
            port: 5000,
            path: '/api/products',
            method: 'GET'
        });
        const product = productsRes.body[0];
        console.log('Got product:', product.name, product._id);

        // 3. Create Order
        const orderData = JSON.stringify({
            items: [{
                product: product._id, // Valid ObjectId
                name: product.name,
                quantity: 1,
                price: product.price
            }],
            total: product.price,
            paymentMethod: 'Cash on Delivery',
            deliveryAddress: {
                street: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                zip: '12345'
            }
        });

        const orderOptions = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/orders',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        console.log('Creating order...');
        const orderRes = await makeRequest(orderOptions, orderData);
        console.log('Order Status:', orderRes.status);
        console.log('Order Response:', JSON.stringify(orderRes.body, null, 2));

    } catch (err) {
        console.error('Test Failed:', err);
    }
})();
