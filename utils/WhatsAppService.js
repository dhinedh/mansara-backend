const axios = require('axios');

class WhatsAppService {
    constructor() {
        this.apiKey = process.env.BOTBIZ_API_KEY;
        this.baseUrl = process.env.BOTBIZ_BASE_URL || 'https://dash.botbiz.io/api/v1';
        this.phoneId = process.env.BOTBIZ_PHONE_ID;

        // BOTBIZ KEY FORMAT HANDLING: user_id|api_token
        this.userId = null;
        this.tokenPart = this.apiKey;
        if (this.apiKey && this.apiKey.includes('|')) {
            const parts = this.apiKey.split('|');
            this.userId = parts[0];
            this.tokenPart = parts[1];
        }

        console.log(`!!! [WHATSAPP SERVICE] Initializing...`);
        console.log(`!!! [WHATSAPP SERVICE] User ID: ${this.userId || 'none'}`);
        console.log(`!!! [WHATSAPP SERVICE] Phone ID: ${this.phoneId || '✗ MISSING'}`);

        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
    }

    /**
     * Helper to normalize phone number (adds 91 for Indian numbers if missing)
     */
    _normalizePhone(phone) {
        if (!phone) return null;
        // Strip everything but digits
        let clean = phone.toString().replace(/\D/g, '');
        if (clean.length === 10) {
            clean = '91' + clean;
        }
        // Ensure no '+' prefix which BotBiz sometimes rejects
        return clean;
    }

    /**
     * Create or update a subscriber
     */
    async createSubscriber(phone, name, details = {}) {
        try {
            const normalizedPhone = this._normalizePhone(phone);
            const payload = {
                apiToken: this.tokenPart,
                phoneNumberID: this.phoneId,
                phone: normalizedPhone,
                name: name,
                ...details
            };
            if (this.userId) payload.user_id = this.userId;

            const response = await this.client.post('/whatsapp/subscriber/create', payload);
            console.log(`[WHATSAPP] Subscriber created: ${normalizedPhone}`);
            return response.data;
        } catch (error) {
            console.error('[WHATSAPP SERVICE] Error creating subscriber:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Send a WhatsApp message
     */
    async sendMessage(phone, message) {
        try {
            const normalizedPhone = this._normalizePhone(phone);
            
            // Botbiz often requires the FULL KEY (user_id|token) in the payload or query
            const payload = {
                apiToken: this.apiKey,      // Try full key first
                api_token: this.apiKey,     // Try snake case
                phoneNumberID: this.phoneId,
                phone_number: normalizedPhone,
                message: message
            };

            if (this.userId) payload.user_id = this.userId;

            console.log(`!!! [WHATSAPP SERVICE] Sending to ${normalizedPhone}`);

            // Try sending with full key in body
            let response = await this.client.post('/whatsapp/send', payload);
            
            // IF result contains "Access denied" or similar, try alternative format
            if (response.data?.status === 'error' || response.data?.e === 'Access denied.') {
                console.log(`!!! [WHATSAPP SERVICE] Retry with query-string token...`);
                // Test 4 format: apiToken in Query
                response = await this.client.post(`/whatsapp/send?apiToken=${this.apiKey}`, {
                    phoneNumberID: this.phoneId,
                    phone_number: normalizedPhone,
                    message: message,
                    user_id: this.userId
                });
            }

            console.log(`!!! [WHATSAPP] ✓ API Response:`, JSON.stringify(response.data));
            return response.data;
        } catch (error) {
            const errorDetails = error.response?.data || error.message;
            console.error('!!! [WHATSAPP SERVICE] ✗ API Error:', error.response?.status, JSON.stringify(errorDetails));
            throw error;
        }
    }

    /**
     * Send direct message via Meta WhatsApp Cloud API
     */
    async sendMetaCloudMessage(phone, text) {
        const token = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
        const phoneId = process.env.META_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID || '1234259863105295';
        const normalizedPhone = this._normalizePhone(phone);

        if (!token || !phoneId) {
            throw new Error('Missing Meta API credentials (META_ACCESS_TOKEN / META_PHONE_NUMBER_ID)');
        }

        console.log(`[WHATSAPP SERVICE] Delivering via Meta Cloud API to ${normalizedPhone}...`);
        const response = await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v20.0/${phoneId}/messages`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            data: {
                messaging_product: 'whatsapp',
                to: normalizedPhone,
                type: 'text',
                text: { body: text }
            },
            timeout: 8000
        });

        console.log(`[WHATSAPP SERVICE] ✓ Delivered via Meta Cloud API to ${normalizedPhone}`);
        return response.data;
    }

    /**
     * Send OTP via WhatsApp Bot Automation API (with Direct Meta Cloud API Fallback)
     */
    async sendOTP(phone, otp, type = 'registration') {
        const normalizedPhone = this._normalizePhone(phone);
        const botUrl = process.env.WHATSAPP_BOT_URL || 'https://whatapp-automation-kxml.onrender.com';
        
        console.log(`[WHATSAPP SERVICE] Sending ${type} OTP (${otp}) to ${normalizedPhone} via WhatsApp Bot Automation...`);

        // 1. Try WhatsApp Bot Automation API (Fast 4s Timeout)
        try {
            const response = await axios.post(`${botUrl}/api/send-otp`, {
                phone: normalizedPhone,
                otp: otp,
                type: type
            }, { timeout: 4000 });

            console.log(`[WHATSAPP SERVICE] ✓ OTP successfully delivered via WhatsApp Bot:`, response.data);
            return response.data;
        } catch (error) {
            console.warn(`[WHATSAPP SERVICE] Bot Automation API unreachable (${error.message}). Falling back to direct Meta Cloud API...`);
        }

        // 2. Direct Meta WhatsApp Cloud API Fallback (Guarantees delivery even if bot server is sleeping/offline)
        let message = "";
        if (type === 'forgot_password') {
            message = `🔐 *Mansara Foods - Password Reset Code*\n\nNamaste! 🙏\nYour verification code is: *${otp}*\n\nValid for 10 minutes. Do not share this code with anyone.`;
        } else {
            message = `🌿 *Welcome to Mansara Foods!* 🙏\n\nYour account registration verification code is: *${otp}*\n\nValid for 10 minutes. Please enter this code on the website to verify your account.`;
        }

        try {
            return await this.sendMetaCloudMessage(phone, message);
        } catch (metaErr) {
            console.error('[WHATSAPP SERVICE] ✗ Meta Direct Delivery Failed:', metaErr?.response?.data || metaErr.message);
            // 3. Last-ditch Botbiz fallback
            if (this.phoneId && this.apiKey) {
                console.log(`[WHATSAPP SERVICE] Attempting Botbiz fallback for ${normalizedPhone}...`);
                return this.sendMessage(phone, message);
            }
            throw metaErr;
        }
    }

    /**
     * Send bulk WhatsApp messages with delay
     */
    async sendBulkWhatsApp(messagesList, delay = 1000) {
        console.log(`[WHATSAPP] Sending ${messagesList.length} bulk messages with ${delay}ms delay`);
        const results = { success: [], failed: [] };

        for (const item of messagesList) {
            try {
                await this.sendMessage(item.phone, item.message);
                results.success.push(item.phone);
            } catch (error) {
                results.failed.push({ phone: item.phone, error: error.message });
            }
            if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
        }

        return results;
    }

    /**
     * Assign labels (Loyalty Tagger)
     */
    async assignLabels(phone, labels) {
        try {
            const normalizedPhone = this._normalizePhone(phone);
            const response = await this.client.post('/whatsapp/subscriber/chat/assign-labels', {
                phone: normalizedPhone,
                labels: Array.isArray(labels) ? labels : [labels]
            });
            console.log(`[WHATSAPP] Labels assigned to ${normalizedPhone}: ${labels}`);
            return response.data;
        } catch (error) {
            console.error('[WHATSAPP SERVICE] Error assigning labels:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get conversation history
     */
    async getConversation(phone) {
        try {
            const normalizedPhone = this._normalizePhone(phone);
            const response = await this.client.get(`/whatsapp/get/conversation?phone=${normalizedPhone}`);
            return response.data;
        } catch (error) {
            console.error('[WHATSAPP SERVICE] Error fetching conversation:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Sync catalog
     */
    async syncCatalog(products) {
        try {
            const response = await this.client.post('/whatsapp/catalog/sync', {
                products: products
            });
            console.log(`[WHATSAPP] Catalog sync requested for ${products.length} items`);
            return response.data;
        } catch (error) {
            console.error('[WHATSAPP SERVICE] Error syncing catalog:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Send Order Confirmation
     */
    async sendOrderConfirmation(order, user) {
        const phone = user.whatsapp || user.phone;
        if (!phone) return;

        const message = `Namaste ${user.name}! 🙏\n\nYour order #${order.orderId} from Mansara Nourish Hub has been placed successfully. 🥳\n\nTotal: ₹${order.total}\nStatus: ${order.orderStatus}\n\nWe will notify you once it's shipped! 🚛`;

        await this.createSubscriber(phone, user.name);
        return await this.sendMessage(phone, message);
    }

    /**
     * Send Status Notification
     */
    async sendStatusNotification(order, user, status) {
        const phone = user.whatsapp || user.phone;
        if (!phone) return;

        let message = `Hi ${user.name}! Your order #${order.orderId} status has been updated to: *${status}*.`;

        if (status === 'Shipped') {
            message += `\n\nYour healthy goodies are on the way! 🚛💨`;
        } else if (status === 'Delivered') {
            message += `\n\nYour order has been delivered! Hope you enjoy your Mansara experience. ✨ Please leave us a review!`;
        }

        return await this.sendMessage(phone, message);
    }
}

module.exports = new WhatsAppService();
