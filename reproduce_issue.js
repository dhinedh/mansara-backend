const mongoose = require('mongoose');
const http = require('http');
const dotenv = require('dotenv');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const { Product } = require('./models/Product');

dotenv.config();

// Connect to DB for direct manipulation
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mansara-db')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => {
        console.error('DB Connection Error:', err);
        process.exit(1);
    });

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

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

(async () => {
    try {
        console.log('--- STARTING REPRODUCTION SCRIPT (DIRECT DB) ---');

        // 1. Create Test User (Direct DB)
        console.log('Creating Test User in DB...');
        const userEmail = `test_user_direct_${Date.now()}@example.com`;
        const userPhone = '9' + Math.floor(100000000 + Math.random() * 900000000);
        const testUser = await User.create({
            name: 'Test User Direct',
            email: userEmail,
            password: 'password123', // Will be hashed by pre-save
            phone: userPhone,
            whatsapp: userPhone,
            role: 'user',
            isVerified: true
        });
        const userToken = generateToken(testUser._id);
        console.log('User created:', testUser._id);

        // 2. Create Test Admin (Direct DB)
        console.log('Creating Test Admin in DB...');
        const adminEmail = `test_admin_direct_${Date.now()}@example.com`;
        const adminPhone = '9' + Math.floor(100000000 + Math.random() * 900000000);
        const testAdmin = await User.create({
            name: 'Test Admin Direct',
            email: adminEmail,
            password: 'password123',
            phone: adminPhone,
            whatsapp: adminPhone,
            role: 'admin',
            isVerified: true
        });
        const adminToken = generateToken(testAdmin._id);
        console.log('Admin created:', testAdmin._id);

        // 3. Get Products
        const productsRes = await makeRequest({
            hostname: 'localhost',
            port: 5000,
            path: '/api/products',
            method: 'GET'
        });

        let product;
        if (productsRes.body.products && productsRes.body.products.length > 0) {
            product = productsRes.body.products[0];
        } else if (Array.isArray(productsRes.body) && productsRes.body.length > 0) {
            product = productsRes.body[0];
        }

        if (!product) throw new Error('No products found to order');
        console.log('Using Product:', JSON.stringify(product, null, 2));

        const productId = product.id || product._id;
        console.log('Using Product ID:', productId);

        // UPDATE STOCK
        await Product.findByIdAndUpdate(productId, { stock: 100 });
        console.log('Stock updated to 100');

        // 4. Create Order (Simulate Online Payment)
        console.log('Creating Order with Payment...');
        const razorpay_order_id = `order_${Date.now()}`;
        const razorpay_payment_id = `pay_${Date.now()}`;
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const signature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder')
            .update(sign.toString())
            .digest("hex");

        const orderData = JSON.stringify({
            items: [{
                id: productId, // For backend loop
                product: productId, // For schema validation
                name: product.name,
                quantity: 1,
                price: product.price,
                type: 'product'
            }],
            total: product.price,
            paymentMethod: 'Online Payment (Razorpay)',
            paymentInfo: {
                id: razorpay_payment_id,
                orderId: razorpay_order_id,
                signature: signature
            },
            deliveryAddress: {
                firstName: 'Test',
                street: '123 Test St',
                city: 'Test City',
                state: 'Test State',
                zip: '123456',
                phone: '9876543210'
            }
        });

        const orderRes = await makeRequest({
            hostname: 'localhost',
            port: 5000,
            path: '/api/orders',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            }
        }, orderData);

        if (orderRes.status !== 201) {
            console.error('Order Response:', JSON.stringify(orderRes.body, null, 2));
            throw new Error(`Order creation failed with status ${orderRes.status}`);
        }

        const createdOrderId = orderRes.body._id;
        console.log('Order Created:', createdOrderId);
        console.log('Order Payment Status:', orderRes.body.paymentStatus);

        if (orderRes.body.paymentStatus !== 'Paid') {
            console.error('WARNING: Payment Status is NOT Paid! It is:', orderRes.body.paymentStatus);
        }

        // 5. Fetch Orders as Admin
        console.log('Fetching Orders as Admin...');
        const fetchRes = await makeRequest({
            hostname: 'localhost',
            port: 5000,
            path: '/api/orders',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (fetchRes.status !== 200) throw new Error(`Admin fetch failed: ${JSON.stringify(fetchRes.body)}`);

        const orders = fetchRes.body.orders || fetchRes.body;
        const foundOrder = orders.find(o => o._id === createdOrderId);

        if (foundOrder) {
            console.log('SUCCESS: Order found in Admin list!');
            console.log('Admin View Payment Status:', foundOrder.paymentStatus);
            if (foundOrder.paymentStatus !== 'Paid') {
                console.error('FAILURE: Admin sees status as', foundOrder.paymentStatus);
            }
        } else {
            console.error('FAILURE: Order NOT found in Admin list!');
        }

        // Cleanup
        console.log('Cleaning up...');
        await User.findByIdAndDelete(testUser._id);
        await User.findByIdAndDelete(testAdmin._id);
        const Order = require('./models/Order');
        await Order.findByIdAndDelete(createdOrderId);
        console.log('Cleanup done.');

        process.exit(0);

    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exit(1);
    }
})();
