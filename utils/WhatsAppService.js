const axios = require('axios');

class WhatsAppService {
    constructor() {
        this.apiKey = process.env.BOTBIZ_API_KEY;
        this.baseUrl = process.env.BOTBIZ_BASE_URL || 'https://dash.botbiz.io/api/v1';
        this.phoneId = process.env.BOTBIZ_PHONE_ID;

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
     * Create or update a subscriber
     */
    async createSubscriber(phone, name, details = {}) {
        try {
            const response = await this.client.post('/whatsapp/subscriber/create', {
                phone: phone.replace(/\D/g, ''), // Ensure numeric only
                name: name,
                ...details
            });
            console.log(`[WHATSAPP] Subscriber created: ${phone}`);
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
            const response = await this.client.post('/whatsapp/send', {
                phone: phone.replace(/\D/g, ''),
                message: message,
                phone_id: this.phoneId
            });
            console.log(`[WHATSAPP] Message sent to: ${phone}`);
            return response.data;
        } catch (error) {
            console.error('[WHATSAPP SERVICE] Error sending message:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Assign labels (Loyalty Tagger)
     */
    async assignLabels(phone, labels) {
        try {
            // Note: Botbiz usually needs subscriber ID, but if phone is matched internally:
            const response = await this.client.post('/whatsapp/subscriber/chat/assign-labels', {
                phone: phone.replace(/\D/g, ''),
                labels: Array.isArray(labels) ? labels : [labels]
            });
            console.log(`[WHATSAPP] Labels assigned to ${phone}: ${labels}`);
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
            const response = await this.client.get(`/whatsapp/get/conversation?phone=${phone.replace(/\D/g, '')}`);
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
