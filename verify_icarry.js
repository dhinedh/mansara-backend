const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// MOCK DATA
const dummyOrder = {
    orderId: 'ORD123456789',
    createdAt: new Date(),
    paymentMethod: 'Prepaid',
    total: 1499,
    deliveryAddress: {
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Main St, Tech Park',
        city: 'Bangalore',
        state: 'Karnataka',
        zip: '560001',
        phone: '9876543210',
    },
    user: {
        email: 'john@example.com'
    },
    items: [
        {
            name: 'Black Rice 500g',
            quantity: 2,
            price: 500,
            product: { weight: '500g', sku: 'BR-500' }
        },
        {
            name: 'Millet Mix 250g',
            quantity: 1,
            price: 499,
            weight: '250 gm' // Direct weight on item
        }
    ]
};

// 1. VERIFY PALYOAD GENERATION (Logic extracted from iCarryService)
console.log('--- 1. VERIFYING SHIPMENT PAYLOAD ---');

function calculateWeight(order) {
    let totalWeight = 0;
    order.items.forEach(item => {
        const productWeight = item.weight || (item.product ? item.product.weight : '0');
        if (productWeight) {
            const str = productWeight.toString().toLowerCase().replace(/\s/g, '');
            let val = parseFloat(str);
            if (!isNaN(val)) {
                if (str.includes('gm') || (str.includes('g') && !str.includes('kg'))) {
                    val = val / 1000;
                } else if (str.includes('ml')) {
                    val = val / 1000;
                }
                totalWeight += (val * item.quantity);
            }
        }
    });
    if (totalWeight < 0.05) totalWeight = 0.5;
    return parseFloat(totalWeight.toFixed(2));
}

const calculatedWeight = calculateWeight(dummyOrder);
console.log(`Input Items:
1. 2x 500g
2. 1x 250gm`);
console.log(`Expected Weight: (2 * 0.5) + (1 * 0.25) = 1.25 kg`);
console.log(`Calculated Weight: ${calculatedWeight} kg`);

if (calculatedWeight === 1.25) {
    console.log('✅ Weight Calculation Correct');
} else {
    console.error('❌ Weight Calculation Failed');
}

// 2. VERIFY WEBHOOK ENDPOINTS
console.log('\n--- 2. VERIFYING WEBHOOK SIMULATION ---');
const webhookPayload = {
    order_id: dummyOrder.orderId,
    status: 'Shipped',
    awb: 'ICARRY123456',
    courier: 'Delhivery',
    remark: 'Package picked up',
    timestamp: new Date().toISOString()
};

console.log('Test Payload:', JSON.stringify(webhookPayload, null, 2));
console.log('\nTo test webhook against running server, run:');
console.log(`curl -X POST http://localhost:5000/api/webhooks/shipping-updates -H "Content-Type: application/json" -d '${JSON.stringify(webhookPayload)}'`);

// Attempt to call if server is running
async function testWebhook() {
    try {
        console.log('\nAttempting request to http://localhost:5000...');
        const res = await axios.post('http://localhost:5000/api/webhooks/shipping-updates', webhookPayload);
        console.log('✅ Webhook Response:', res.status, res.data);
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('ℹ️ Server is not running on port 5000. Start server to test webhook.');
        } else {
            console.error('❌ Webhook Request Failed:', error.message);
        }
    }
}

testWebhook();
