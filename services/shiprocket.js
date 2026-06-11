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

        let shipmentId = order.shipping.shipmentId;
        let srOrderId = order.shipping.srOrderId;

        // 1. Create Shiprocket Order if not already created
        if (!shipmentId) {
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
                breadth: 10,
                height: 10,
                weight: 0.5 // Default weight in KG
            };

            const srOrder = await srRequest('POST', '/orders/create/adhoc', srOrderPayload);
            
            if (!srOrder || !srOrder.order_id) {
                console.error('[SHIPROCKET ERROR] Create Order Failed:', JSON.stringify(srOrder));
                throw new Error(srOrder?.message || 'Failed to create order in Shiprocket');
            }

            srOrderId = srOrder.order_id;
            shipmentId = srOrder.shipment_id;
            order.shipping.srOrderId = srOrderId;
            order.shipping.shipmentId = shipmentId;
            await order.save();

            console.log(`[SHIPROCKET] Order Created: SR_ID ${srOrderId}`);
        } else {
            console.log(`[SHIPROCKET] Order already created in Shiprocket (SR_ID: ${srOrderId}, Shipment ID: ${shipmentId}). Skipping creation step.`);
        }

        let awbCode = order.shipping.awb;
        let selectedCourierName = order.shipping.courierName;
        let selectedCourierId = order.shipping.courierId;

        // 2 & 3. Select Courier and Assign AWB if not already assigned
        if (!awbCode) {
            const serviceability = await srRequest('GET', `/courier/serviceability?pickup_postcode=${process.env.SR_PICKUP_PINCODE}&delivery_postcode=${order.deliveryAddress.zip}&weight=0.5&cod=${order.paymentMethod === 'Cash on Delivery' ? 1 : 0}`);
            
            if (!serviceability || !serviceability.data || !serviceability.data.available_courier_companies) {
                console.error('[SHIPROCKET ERROR] Serviceability Failed:', JSON.stringify(serviceability));
                throw new Error(serviceability?.message || 'No couriers available or serviceability check failed');
            }

            const availableCouriers = serviceability.data.available_courier_companies;
            if (!availableCouriers || availableCouriers.length === 0) {
                throw new Error('No couriers available for this location');
            }

            // Sort by freight_charge to find cheapest couriers
            const sortedCouriers = availableCouriers.sort((a, b) => a.freight_charge - b.freight_charge);
            
            // Try to assign AWB using couriers in order of cost (up to 3 couriers)
            const maxCourierTries = Math.min(sortedCouriers.length, 3);
            let lastError = null;

            for (let i = 0; i < maxCourierTries; i++) {
                const courier = sortedCouriers[i];
                console.log(`[SHIPROCKET] Selected Courier ${i + 1}/${maxCourierTries}: ${courier.courier_name} (Cost: ${courier.freight_charge})`);
                try {
                    const awbAssignment = await srRequest('POST', '/courier/assign/awb', {
                        shipment_id: shipmentId,
                        courier_id: courier.courier_company_id
                    });

                    let possibleAwbCode = awbAssignment.response?.data?.awb_code;
                    if (!possibleAwbCode) {
                        const errorMsg = awbAssignment.response?.data?.awb_assign_error;
                        if (errorMsg && errorMsg.includes('already assigned')) {
                            const match = errorMsg.match(/awb - ([a-zA-Z0-9]+)/i);
                            if (match && match[1]) {
                                possibleAwbCode = match[1];
                            } else {
                                throw new Error('AWB already assigned but could not extract AWB code: ' + errorMsg);
                            }
                        } else {
                            throw new Error('Failed to assign AWB: ' + JSON.stringify(awbAssignment));
                        }
                    }

                    awbCode = possibleAwbCode;
                    selectedCourierName = courier.courier_name;
                    selectedCourierId = courier.courier_company_id;
                    console.log(`[SHIPROCKET] Successfully assigned AWB: ${awbCode} using courier: ${selectedCourierName}`);
                    break; // Exit loop on success
                } catch (err) {
                    console.warn(`[SHIPROCKET WARNING] Failed to assign AWB with courier ${courier.courier_name}: ${err.message}`);
                    lastError = err;
                }
            }

            if (!awbCode) {
                throw new Error(`Failed to assign AWB after trying ${maxCourierTries} couriers. Last error: ${lastError?.message}`);
            }

            order.shipping.awb = awbCode;
            order.shipping.courierId = selectedCourierId;
            order.shipping.courierName = selectedCourierName;
            await order.save();
        } else {
            console.log(`[SHIPROCKET] AWB already assigned (AWB: ${awbCode}, Courier: ${selectedCourierName}). Skipping AWB assignment step.`);
        }

        // 4. Generate Label
        let labelUrl = order.shipping.labelUrl;
        if (!labelUrl) {
            const labelData = await srRequest('POST', '/courier/generate/label', {
                shipment_id: [shipmentId]
            });
            labelUrl = labelData.label_url;
            order.shipping.labelUrl = labelUrl;
            await order.save();
            console.log(`[SHIPROCKET] Label Generated: ${labelUrl}`);
        } else {
            console.log(`[SHIPROCKET] Label already generated: ${labelUrl}. Skipping label generation step.`);
        }

        // 5. Schedule Pickup
        console.log(`[SHIPROCKET] Scheduling pickup...`);
        await srRequest('POST', '/courier/generate/pickup', {
            shipment_id: [shipmentId]
        });

        // 6. Generate Invoice
        let invoiceUrl = order.shipping.invoiceUrl;
        if (!invoiceUrl) {
            try {
                const invoiceData = await srRequest('POST', '/orders/print/invoice', {
                    ids: [srOrderId]
                });
                if (invoiceData && invoiceData.is_invoice_created && invoiceData.invoice_url) {
                    invoiceUrl = invoiceData.invoice_url;
                    order.shipping.invoiceUrl = invoiceUrl;
                }
            } catch (invoiceErr) {
                console.error('[SHIPROCKET] Failed to generate invoice:', invoiceErr.message);
            }
        } else {
            console.log(`[SHIPROCKET] Invoice already generated: ${invoiceUrl}. Skipping invoice generation step.`);
        }

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
