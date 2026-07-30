const axios = require('axios');

class WhatsAppService {
    constructor() {
        this.token = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN;
        this.phoneId = process.env.META_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID || '1234259863105295';
        console.log(`[WHATSAPP SERVICE] Initialized with Meta Cloud API (Phone ID: ${this.phoneId})`);
    }

    /**
     * Helper to normalize phone number (adds 91 for Indian numbers if missing)
     */
    _normalizePhone(phone) {
        if (!phone) return null;
        let clean = phone.toString().replace(/\D/g, '');
        if (clean.length === 10) {
            clean = '91' + clean;
        }
        return clean;
    }

    /**
     * Send direct text message via Meta WhatsApp Cloud API
     */
    async sendMetaCloudMessage(phone, text) {
        const token = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN || this.token;
        const phoneId = process.env.META_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID || this.phoneId;
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
     * Send a WhatsApp message (Alias for Meta Cloud Message)
     */
    async sendMessage(phone, message) {
        return this.sendMetaCloudMessage(phone, message);
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

        // 2. Direct Meta WhatsApp Cloud API Fallback
        let message = "";
        if (type === 'forgot_password') {
            message = `🔐 *Mansara Foods - Password Reset Code*\n\nNamaste! 🙏\nYour verification code is: *${otp}*\n\nValid for 10 minutes. Do not share this code with anyone.`;
        } else {
            message = `🌿 *Welcome to Mansara Foods!* 🙏\n\nYour account registration verification code is: *${otp}*\n\nValid for 10 minutes. Please enter this code on the website to verify your account.`;
        }

        return await this.sendMetaCloudMessage(phone, message);
    }

    /**
     * Send Admin WhatsApp New Order Notification (to 918838887064)
     */
    async sendAdminOrderNotification(order, user) {
        const adminPhone = process.env.ADMIN_PHONE || '918838887064';
        const botUrl = process.env.WHATSAPP_BOT_URL || 'https://whatapp-automation-kxml.onrender.com';

        const addr = order.deliveryAddress;
        const fullAddr = addr ? `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} - ${addr.zip || ''}` : 'N/A';
        const custName = (addr && addr.firstName) ? `${addr.firstName} ${addr.lastName || ''}` : (user?.name || 'Website Customer');
        const custPhone = user?.whatsapp || user?.phone || addr?.phone || 'N/A';

        const itemsList = (order.items || []).map(i => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            weight: i.weight || ''
        }));

        console.log(`[WHATSAPP SERVICE] Sending Admin New Order Alert (#${order.orderId}) to Admin ${adminPhone}...`);

        try {
            await axios.post(`${botUrl}/api/notify-admin-order`, {
                orderId: order.orderId,
                customerName: custName,
                customerPhone: custPhone,
                address: fullAddr,
                items: itemsList,
                total: order.total,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus
            }, { timeout: 5000 });
            console.log(`[WHATSAPP SERVICE] ✓ Admin order alert sent via Bot Automation API`);
        } catch (err) {
            console.warn('[WHATSAPP SERVICE] Bot API unreachable. Sending direct Meta text alert to Admin...', err.message);
            
            const itemsText = itemsList.map(i => `• ${i.quantity}x ${i.name} – ₹${i.price * i.quantity}`).join('\n');
            const alertMsg = `🛍️ *NEW ORDER RECEIVED!* 🛒\n\n` +
                `📦 *Order ID:* ${order.orderId}\n` +
                `👤 *Customer:* ${custName}\n` +
                `📞 *Phone:* ${custPhone}\n` +
                `📍 *Address:* ${fullAddr}\n` +
                `💳 *Payment:* ${order.paymentMethod} (${order.paymentStatus})\n\n` +
                `🛒 *Items Ordered:*\n${itemsText}\n\n` +
                `💰 *Total Amount:* ₹${order.total}\n\n` +
                `Reply to update status: "${order.orderId} Packed", "${order.orderId} Shipped", or "${order.orderId} Delivered"`;

            await this.sendMetaCloudMessage(adminPhone, alertMsg);
        }
    }

    /**
     * Send Admin WhatsApp Low Stock / Out of Stock Alert (to 918838887064)
     */
    async sendAdminStockAlert(productName, stock) {
        const adminPhone = process.env.ADMIN_PHONE || '918838887064';
        const botUrl = process.env.WHATSAPP_BOT_URL || 'https://whatapp-automation-kxml.onrender.com';

        try {
            await axios.post(`${botUrl}/api/notify-admin-stock`, {
                productName,
                stock
            }, { timeout: 5000 });
            console.log(`[WHATSAPP SERVICE] ✓ Admin stock alert sent for ${productName} (stock: ${stock})`);
        } catch (err) {
            let alertMsg = "";
            if (stock <= 0) {
                alertMsg = `🚨 *OUT OF STOCK ALERT!* ❌\n\nProduct: *${productName}*\nRemaining Stock: *0 items*\n\n⚠️ Product is OUT OF STOCK. Please restock immediately!`;
            } else {
                alertMsg = `⚠️ *LOW STOCK ALERT!* 📦\n\nProduct: *${productName}*\nRemaining Stock: *${stock} items*\n\n💡 Stock is running low!`;
            }
            await this.sendMetaCloudMessage(adminPhone, alertMsg);
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
