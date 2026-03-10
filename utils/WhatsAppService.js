const axios = require('axios');

class WhatsAppService {
    constructor() {
        this.apiKey = process.env.BOTBIZ_API_KEY;
        this.baseUrl = process.env.BOTBIZ_BASE_URL || 'https://dash.botbiz.io/api/v1';
        this.phoneId = process.env.BOTBIZ_PHONE_ID;

        console.log(`!!! [WHATSAPP SERVICE] Initializing...`);
        console.log(`!!! [WHATSAPP SERVICE] Environment: ${process.env.NODE_ENV || 'not set'}`);
        console.log(`!!! [WHATSAPP SERVICE] API Key: ${this.apiKey ? '✓ Loaded' : '✗ MISSING'}`);
        console.log(`!!! [WHATSAPP SERVICE] Phone ID: ${this.phoneId || '✗ MISSING'}`);
        console.log(`!!! [WHATSAPP SERVICE] Base URL: ${this.baseUrl}`);

        this.client = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
    }

    /**
     * Helper to normalize phone number (adds 91 for Indian numbers if missing)
     */
    _normalizePhone(phone) {
        let clean = phone.replace(/\D/g, '');
        if (clean.length === 10) {
            clean = '91' + clean;
        }
        return clean;
    }

    /**
     * Create or update a subscriber
     */
    async createSubscriber(phone, name, details = {}) {
        try {
            const normalizedPhone = this._normalizePhone(phone);
            const response = await this.client.post('/whatsapp/subscriber/create', {
                phone: normalizedPhone,
                name: name,
                ...details
            });
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
            console.log(`!!! [WHATSAPP SERVICE] Sending POST to ${this.baseUrl}/whatsapp/send`);
            console.log(`!!! [WHATSAPP SERVICE] Data:`, JSON.stringify({
                phone: normalizedPhone,
                phone_id: this.phoneId
            }));

            const response = await this.client.post('/whatsapp/send', {
                phone: normalizedPhone,
                message: message,
                phone_id: this.phoneId
            });
            console.log(`!!! [WHATSAPP] ✓ API Response:`, JSON.stringify(response.data));
            return response.data;
        } catch (error) {
            console.error('!!! [WHATSAPP SERVICE] ✗ API Error:', error.response?.status, JSON.stringify(error.response?.data || error.message));
            throw error;
        }
    }

    /**
     * Send OTP via WhatsApp
     */
    async sendOTP(phone, otp) {
        const message = `Your Mansara Foods verification code is: *${otp}*.\n\nValid for 10 minutes. Do not share this code with anyone. 🙏`;
        return this.sendMessage(phone, message);
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
