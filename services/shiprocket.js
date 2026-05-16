const axios = require('axios');
const Order = require('../models/Order');

let token = null;
let tokenExpiry = null;

/**
 * Authenticate with Shiprocket
 */
const login = async () => {
    try {
        const response = await axios.post('https://apiv2.shiprocket.in/v1/external/auth/login', {
            email: process.env.SR_EMAIL,
            password: process.env.SR_PASSWORD
        });
        token = response.data.token;
        // Token is usually valid for 24 hours
        tokenExpiry = Date.now() + 23 * 60 * 60 * 1000; // Refresh after 23 hours
        return token;
    } catch (error) {
        console.error('Shiprocket Login Failed:', error.response?.data || error.message);
        throw new Error('Shiprocket Authentication Failed');
    }
};

/**
 * Get cached token or refresh if expired
 */
const getToken = async () => {
    if (!token || Date.now() >= tokenExpiry) {
        return await login();
    }
    return token;
};

/**
 * Reusable Shiprocket Request Helper
 */
const srRequest = async (method, path, data = null) => {
    let currentToken = await getToken();
    
    const execute = async (authToken) => {
        return await axios({
            method,
            url: `https://apiv2.shiprocket.in/v1/external${path}`,
            data,
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
    };

    try {
        const response = await execute(currentToken);
        return response.data;
    } catch (error) {
        // If 401, retry once after refreshing token
        if (error.response?.status === 401) {
            console.log('Shiprocket Token expired unexpectedly, refreshing...');
            currentToken = await login();
            try {
                const retryResponse = await execute(currentToken);
                return retryResponse.data;
            } catch (retryError) {
                console.error('Shiprocket API Retry Failed:', retryError.response?.data || retryError.message);
                throw retryError;
            }
        }
        console.error(`Shiprocket API Error (${path}):`, error.response?.data || error.message);
        throw error;
    }
};

/**
 * Automate Full Shipping Process
 */
const automateShipping = async (orderId) => {
    try {
        const order = await Order.findById(orderId);
        if (!order) throw new Error('Order not found');

        console.log(`[SHIPROCKET] Starting automation for Order: ${order.orderId}`);

        // 1. Create Shiprocket Order
        const srOrderPayload = {
            order_id: order.orderId,
            order_date: new Date(order.createdAt).toISOString().split('T')[0],
            pickup_location: process.env.SR_PICKUP_LOCATION || 'Primary',
            billing_customer_name: order.deliveryAddress.firstName,
            billing_last_name: order.deliveryAddress.lastName || '',
            billing_address: order.deliveryAddress.street,
            billing_city: order.deliveryAddress.city,
            billing_pincode: order.deliveryAddress.zip,
            billing_state: order.deliveryAddress.state,
            billing_country: 'India',
            billing_email: 'contact@mansarafoods.com', // As per request
            billing_phone: order.deliveryAddress.phone,
            shipping_is_billing: true,
            order_items: order.items.map(item => ({
                name: item.name,
                sku: item.product.toString(),
                units: item.quantity,
                selling_price: item.price
            })),
            payment_method: order.paymentMethod === 'Cash on Delivery' ? 'COD' : 'Prepaid',
            sub_total: order.total,
            length: 10, // Default dimensions
            width: 10,
            height: 10,
            weight: 0.5 // Default weight in KG
        };

        const srOrder = await srRequest('POST', '/orders/create/adhoc', srOrderPayload);
        
        order.shipping.srOrderId = srOrder.order_id;
        order.shipping.shipmentId = srOrder.shipment_id;
        await order.save();

        console.log(`[SHIPROCKET] Order Created: SR_ID ${srOrder.order_id}`);

        // 2. Select Cheapest Courier
        const serviceability = await srRequest('GET', `/courier/serviceability?pickup_pincode=${process.env.SR_PICKUP_PINCODE}&delivery_pincode=${order.deliveryAddress.zip}&weight=0.5&cod=${order.paymentMethod === 'Cash on Delivery' ? 1 : 0}`);
        
        const availableCouriers = serviceability.data.available_courier_companies;
        if (!availableCouriers || availableCouriers.length === 0) {
            throw new Error('No couriers available for this location');
        }

        // Sort by freight_charge to find cheapest
        const cheapestCourier = availableCouriers.sort((a, b) => a.freight_charge - b.freight_charge)[0];
        
        console.log(`[SHIPROCKET] Selected Courier: ${cheapestCourier.courier_name} (Cost: ${cheapestCourier.freight_charge})`);

        // 3. Assign AWB
        const awbAssignment = await srRequest('POST', '/courier/assign/awb', {
            shipment_id: order.shipping.shipmentId,
            courier_id: cheapestCourier.courier_company_id
        });

        if (!awbAssignment.payload.awb_code) {
            throw new Error('Failed to assign AWB');
        }

        order.shipping.awb = awbAssignment.payload.awb_code;
        order.shipping.courierId = cheapestCourier.courier_company_id;
        order.shipping.courierName = cheapestCourier.courier_name;
        await order.save();

        // 4. Generate Label
        const labelData = await srRequest('POST', '/courier/generate/label', {
            shipment_id: [order.shipping.shipmentId]
        });

        order.shipping.labelUrl = labelData.label_url;
        await order.save();

        // 5. Schedule Pickup
        await srRequest('POST', '/courier/generate/pickup', {
            shipment_id: [order.shipping.shipmentId]
        });

        order.shipping.status = 'picked_up'; // Initial status after pickup schedule
        order.orderStatus = 'Shipped';
        await order.save();

        console.log(`[SHIPROCKET] Automation Complete for ${order.orderId}. AWB: ${order.shipping.awb}`);
        return { success: true, awb: order.shipping.awb };

    } catch (error) {
        console.error(`[SHIPROCKET ERROR] ${error.message}`);
        // If automation fails, set status to pending as requested
        try {
            const order = await Order.findOne({ _id: orderId });
            if (order) {
                order.shipping.status = 'pending';
                await order.save();
            }
        } catch (dbErr) {
            console.error('Failed to update order status after SR failure:', dbErr);
        }
        return { success: false, error: error.message };
    }
};

module.exports = {
    srRequest,
    automateShipping
};
