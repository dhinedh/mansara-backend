const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.ICARRY_API_KEY;
const USERNAME = process.env.ICARRY_USERNAME;

/**
 * iCarry Shipping Service
 * Handles interaction with iCarry API for shipment creation and tracking.
 */
const iCarryService = {

    /**
     * Obtains a session api_token from iCarry login endpoint.
     */
    getSessionToken: async () => {
        try {
            if (!API_KEY || !USERNAME) {
                throw new Error('iCarry API credentials not configured in .env');
            }

            const qs = require('querystring');
            const loginUrl = 'https://www.icarry.in/api_login';

            console.log('[iCarry] Attempting Login to obtain session token...');
            const response = await axios.post(loginUrl, qs.stringify({
                username: USERNAME,
                Key: API_KEY
            }), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 10000
            });

            if (response.data && response.data.api_token) {
                console.log('[iCarry] Session token obtained successfully.');
                return response.data.api_token;
            } else {
                const errorMsg = response.data?.error || 'Unknown login error';
                throw new Error(`iCarry Login Failed: ${errorMsg}`);
            }
        } catch (error) {
            console.error('[iCarry] Authentication Error:', error.message);
            throw error;
        }
    },

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

            // Calculate total weight
            let totalWeight = 0;
            if (order.items) {
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
            }

            if (totalWeight < 0.05) totalWeight = 0.5;

            // 1. Get Session API Token
            const sessionToken = await iCarryService.getSessionToken();

            // 2. Fix base URL logic: Use .env BASE_URL if provided, else fallback to icarry.in
            const rawBaseUrl = process.env.ICARRY_BASE_URL || 'https://www.icarry.in';
            const baseUrl = rawBaseUrl.replace(/\/$/, '');

            // Use the surface shipment endpoint
            const endpoint = baseUrl.includes('api_') ? baseUrl : `${baseUrl}/api_add_shipment_surface`;
            const finalUrl = `${endpoint}?api_token=${sessionToken}`;

            // 3. Construct Payload with correct keys for iCarry Surface API
            const payload = {
                username: USERNAME,
                order_id: order.orderId,
                order_date: new Date(order.createdAt).toISOString().split('T')[0],
                consignee_name: `${order.deliveryAddress.firstName} ${order.deliveryAddress.lastName || ''}`.trim(),
                consignee_address: order.deliveryAddress.street,
                consignee_city: order.deliveryAddress.city,
                consignee_state: order.deliveryAddress.state,
                consignee_country: 'India',
                consignee_pincode: order.deliveryAddress.zip,
                consignee_mobile: order.deliveryAddress.phone,
                consignee_email: order.user?.email || '',
                parcel_type: order.paymentMethod === 'Cash on Delivery' ? 'C' : 'P', // C=COD, P=Prepaid
                parcel_value: order.total,
                parcel_contents: order.items ? order.items.map(i => i.name).join(', ') : 'Food Items',
                weight: Math.round(totalWeight * 1000), // Convert to grams
                weight_unit: 'gm',
                pickup_address: 'Mansara Foods', // Default pickup name
                pickup_pincode: process.env.ICARRY_PICKUP_PINCODE || '600001',
                length: 10,
                breadth: 10,
                height: 5,
                package_type: 'Parcel'
            };

            console.log('[iCarry] Creating Shipment at:', finalUrl);

            // Use application/x-www-form-urlencoded
            const qs = require('querystring');
            const response = await axios.post(finalUrl, qs.stringify(payload), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                timeout: 30000
            });

            console.log('[iCarry] Response Status:', response.status);
            console.log('[iCarry] Response Body:', typeof response.data === 'object' ? JSON.stringify(response.data) : response.data);

            const isSuccess = response.data && (
                response.data.success === 1 || 
                response.data.success === true || 
                response.data.status === 'success' || 
                !!response.data.shipment_id || 
                !!response.data.awb_number
            );

            if (isSuccess) {
                return {
                    success: true,
                    trackingNumber: response.data.awb_number || response.data.shipment_id || response.data.tracking_id,
                    courier: response.data.courier_name || 'iCarry',
                    data: response.data
                };
            } else {
                // Better error extraction
                let errorMsg = 'Failed to create shipment';
                if (typeof response.data === 'string') {
                    errorMsg = response.data;
                } else if (response.data && typeof response.data === 'object') {
                    errorMsg = response.data.error || response.data.message || response.data.msg || JSON.stringify(response.data);
                }
                
                console.error(`[iCarry] API returned failure: ${errorMsg}`);
                return {
                    success: false,
                    error: errorMsg,
                    raw: response.data
                };
            }

        } catch (error) {
            const status = error.response?.status;
            const errorDetail = error.response?.data?.error || error.response?.data?.message || (error.code === 'ECONNABORTED' ? 'Gateway Timeout' : error.message);

            console.error(`[iCarry] Create Shipment Error [Status ${status || 'Unknown'}]:`, JSON.stringify(error.response?.data || error.message));

            return {
                success: false,
                error: errorDetail,
                raw: error.response?.data
            };
        }
    },

    /**
     * Check serviceability for a pincode
     */
    checkServiceability: async (pincode) => {
        try {
            const sessionToken = await iCarryService.getSessionToken();
            const response = await axios.get(`https://www.icarry.in/api_pincode_check`, {
                params: {
                    username: USERNAME,
                    api_token: sessionToken,
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
