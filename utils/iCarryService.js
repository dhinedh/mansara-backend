const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.ICARRY_API_KEY;
const USERNAME = process.env.ICARRY_USERNAME;
const BASE_URL = process.env.ICARRY_BASE_URL || 'https://icarry.in/api_v3'; // Default to v3 or configured URL

/**
 * iCarry Shipping Service
 * Handles interaction with iCarry API for shipment creation and tracking.
 */
const iCarryService = {

    /**
     * Create a shipment in iCarry
     * @param {Object} order - The order object from DB
     * @returns {Promise<Object>} - The API response with AWB/Tracking info
     */
    createShipment: async (order) => {
        try {
            if (!API_KEY || !USERNAME) {
                throw new Error('iCarry API credentials not configured');
            }

            // Map Order to iCarry Payload
            // Note: This payload structure is a BEST EFFORT estimation based on common logistics APIs.
            // You may need to adjust field names based on the specific iCarry API documentation.

            // Calculate total weight
            let totalWeight = 0;
            order.items.forEach(item => {
                const productWeight = item.weight || (item.product ? item.product.weight : '0');
                if (productWeight) {
                    const str = productWeight.toString().toLowerCase().replace(/\s/g, '');
                    let val = parseFloat(str);
                    if (!isNaN(val)) {
                        if (str.includes('gm') || str.includes('g') && !str.includes('kg')) {
                            val = val / 1000;
                        } else if (str.includes('ml')) {
                            val = val / 1000; // Approx 1g = 1ml
                        } else if (str.includes('l') || str.includes('ltr')) {
                            // val is kg
                        }
                        totalWeight += (val * item.quantity);
                    }
                }
            });

            // Default to 0.5kg if calculation fails or is too low
            if (totalWeight < 0.05) totalWeight = 0.5;

            const payload = {
                username: USERNAME,
                api_key: API_KEY,
                action: 'create_order',

                // Shipment Details
                order_id: order.orderId,
                order_date: new Date(order.createdAt).toISOString().split('T')[0],
                payment_method: order.paymentMethod === 'Cash on Delivery' ? 'COD' : 'Prepaid',
                cod_amount: order.paymentMethod === 'Cash on Delivery' ? order.total : 0,
                total_amount: order.total,

                // Consignee Details
                consignee_name: order.deliveryAddress.firstName + ' ' + (order.deliveryAddress.lastName || ''),
                consignee_address: order.deliveryAddress.street,
                consignee_address_2: '',
                consignee_city: order.deliveryAddress.city,
                consignee_state: order.deliveryAddress.state,
                consignee_pincode: order.deliveryAddress.zip,
                consignee_phone: order.deliveryAddress.phone,
                consignee_email: order.user?.email || '',

                // Package Details
                weight: parseFloat(totalWeight.toFixed(2)),
                length: 10,
                breadth: 10,
                height: 5,

                // Items
                items: order.items.map(item => ({
                    name: item.name,
                    sku: (item.product && item.product.sku) ? item.product.sku : 'SKU',
                    quantity: item.quantity,
                    price: item.price
                })),

                // Pickup (Default or configured)
                pickup_pincode: process.env.ICARRY_PICKUP_PINCODE || '110001',
            };

            console.log('[iCarry] Creating Shipment:', JSON.stringify(payload));

            // Verify actual endpoint from docs
            const response = await axios.post(`${BASE_URL}/shipment/create`, payload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            console.log('[iCarry] Response:', response.data);

            if (response.data && response.data.success) {
                return {
                    success: true,
                    trackingNumber: response.data.awb || response.data.tracking_id,
                    courier: 'iCarry',
                    data: response.data
                };
            } else {
                throw new Error(response.data?.message || 'Failed to create shipment');
            }

        } catch (error) {
            console.error('[iCarry] Create Shipment Error:', error.response?.data || error.message);
            // Return error object rather than throwing to allow caller to handle gracefully
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Check serviceability for a pincode
     */
    checkServiceability: async (pincode) => {
        try {
            const response = await axios.get(`${BASE_URL}/pincode/check`, {
                params: {
                    username: USERNAME,
                    api_key: API_KEY,
                    pincode: pincode
                }
            });
            return response.data;
        } catch (error) {
            console.error('[iCarry] Serviceability Check Error:', error.message);
            return null;
        }
    }
};

module.exports = iCarryService;
