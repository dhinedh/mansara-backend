const axios = require('axios');

class WhatsAppService {
    constructor() {
        this.baseURL = process.env.WHATSAPP_API_URL || 'https://api.whatsapp.com';
        this.token = process.env.WHATSAPP_API_TOKEN;
        this.phoneId = process.env.WHATSAPP_PHONE_ID;
        
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        });
    }

    _normalizePhone(phone) {
        if (!phone) return '';
        let clean = phone.toString().replace(/\D/g, '');
        if (clean.length === 10) return '91' + clean;
        return clean;
    }

    /**
     * Send approved WhatsApp Utility Template to bypass Meta's 24-Hour Messaging Policy
     */
    async sendUtilityTemplate(phone, templateName = 'sales_lead_alert', languageCode = 'en', bodyParameters = []) {
        const token = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN || this.token;
        const phoneId = process.env.META_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID || this.phoneId;
        const normalizedPhone = this._normalizePhone(phone);

        if (!token || !phoneId) {
            console.warn('[WHATSAPP SERVICE] Missing Meta API credentials for Utility Template');
            return { success: false, error: 'Missing credentials' };
        }

        console.log(`[WHATSAPP SERVICE] Sending Utility Template (${templateName}) to ${normalizedPhone} (Bypassing 24h Policy)...`);

        const formattedComponents = [];
        if (bodyParameters && bodyParameters.length > 0) {
            formattedComponents.push({
                type: 'body',
                parameters: bodyParameters.map(p => typeof p === 'object' ? p : { type: 'text', text: String(p) })
            });
        }

        try {
            const response = await axios({
                method: 'POST',
                url: `https://graph.facebook.com/v20.0/${phoneId}/messages`,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                data: {
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: normalizedPhone,
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: languageCode },
                        components: formattedComponents
                    }
                },
                timeout: 10000
            });

            console.log(`[WHATSAPP SERVICE] ✓ Utility Template (${templateName}) delivered to ${normalizedPhone}`);
            return response.data;
        } catch (error) {
            console.error('[WHATSAPP SERVICE] Utility Template Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Specialized Helper: Send Sales Lead Alert via Utility Template (sales_lead_alert)
     */
    async sendSalesLeadAlertTemplate(phone, leadData = {}) {
        const params = [
            leadData.customerName || 'New Prospect',
            leadData.phone || phone,
            leadData.requirement || leadData.message || 'Product Inquiry',
            leadData.source || 'Website Lead / Bot'
        ];
        return await this.sendUtilityTemplate(phone, 'sales_lead_alert', 'en', params);
    }

    /**
     * Direct WhatsApp Cloud API delivery via Meta Graph API
     */
    async sendMetaCloudMessage(phone, text) {
        const token = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN || this.token;
        const phoneId = process.env.META_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID || this.phoneId;
        const normalizedPhone = this._normalizePhone(phone);

        if (!token || !phoneId) {
            console.warn('[WHATSAPP SERVICE] Missing Meta API credentials (META_ACCESS_TOKEN / META_PHONE_NUMBER_ID)');
            return { success: false, error: 'Missing credentials' };
        }

        console.log(`[WHATSAPP SERVICE] Delivering direct Meta Cloud message to ${normalizedPhone}...`);
        try {
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
        } catch (error) {
            const errCode = error.response?.data?.error?.code;
            const errMsg = error.response?.data?.error?.message || '';

            // Handle WhatsApp 24-Hour Policy Violation (Error 131047 / Outside 24h Window)
            if (errCode === 131047 || errMsg.includes('24 hour') || errMsg.includes('template')) {
                console.warn(`[WHATSAPP SERVICE] 24-Hour Window Expired for ${normalizedPhone}. Automatically falling back to Utility Notification Template (sales_lead_alert)...`);
                return await this.sendUtilityTemplate(normalizedPhone, 'sales_lead_alert', 'en', [text.slice(0, 1000)]);
            }

            console.error('[WHATSAPP SERVICE] Meta Cloud API Error:', error.response?.data || error.message);
            throw error;
        }
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
        
        console.log(`[WHATSAPP SERVICE] Sending ${type} OTP (${otp}) to ${normalizedPhone}...`);

        try {
            const response = await axios.post(`${botUrl}/api/send-otp`, {
                phone: normalizedPhone,
                otp: otp,
                type: type
            }, { timeout: 4000 });

            console.log(`[WHATSAPP SERVICE] ✓ OTP delivered via WhatsApp Bot:`, response.data);
            return response.data;
        } catch (error) {
            console.warn(`[WHATSAPP SERVICE] Bot Automation API unreachable (${error.message}). Falling back to direct Meta Cloud API...`);
        }

        let message = "";
        if (type === 'forgot_password') {
            message = `🔐 *Mansara Foods - Password Reset Code*\n\nNamaste! 🙏\nYour verification code is: *${otp}*\n\nValid for 10 minutes. Do not share this code with anyone.`;
        } else {
            message = `🌿 *Welcome to Mansara Foods!* 🙏\n\nYour account registration verification code is: *${otp}*\n\nValid for 10 minutes. Please enter this code on the website to verify your account.`;
        }

        return await this.sendMetaCloudMessage(phone, message);
    }

    /**
     * Send Order Confirmation via WhatsApp Bot Automation (with Direct Meta Fallback)
     */
    async sendOrderConfirmation(order, user) {
        const phone = user?.whatsapp || user?.phone || order.deliveryAddress?.phone;
        if (!phone) return;

        const botUrl = process.env.WHATSAPP_BOT_URL || 'https://whatapp-automation-kxml.onrender.com';
        const addr = order.deliveryAddress;
        const fullAddr = addr ? `${addr.street || ''}, ${addr.city || ''}, ${addr.state || ''} - ${addr.zip || ''}` : 'N/A';
        const custName = (addr && addr.firstName) ? `${addr.firstName} ${addr.lastName || ''}` : (user?.name || 'Customer');

        const itemsList = (order.items || []).map(i => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
            weight: i.weight || ''
        }));

        console.log(`[WHATSAPP SERVICE] Sending Order Confirmation (#${order.orderId}) to ${phone}...`);

        try {
            await axios.post(`${botUrl}/api/notify-customer-order`, {
                phone,
                orderId: order.orderId,
                customerName: custName,
                items: itemsList,
                total: order.total,
                address: fullAddr,
                paymentMethod: order.paymentMethod || 'COD',
                paymentStatus: order.paymentStatus || 'Pending',
                trackingLink: `https://mansarafoods.com/order-tracking/${order.orderId}`
            }, { timeout: 5000 });
            console.log(`[WHATSAPP SERVICE] ✓ Customer order confirmation sent via Bot API`);
            return { success: true };
        } catch (err) {
            console.warn('[WHATSAPP SERVICE] Bot API error on order confirmation. Falling back to direct Meta text...', err.message);
            const itemsText = itemsList.map(i => `• ${i.quantity}x ${i.name} – ₹${i.price * i.quantity}`).join('\n');
            const fallbackMsg = `Namaste ${custName}! 🙏\n\n🎉 *Order Confirmed!* 🛍️\n\nOrder ID: *${order.orderId}*\nTotal: *₹${order.total}* (${order.paymentMethod || 'COD'})\n\n🛒 *Items Purchased:*\n${itemsText}\n\n📍 Track status: https://mansarafoods.com/order-tracking/${order.orderId}\n\nWe will notify you when it ships! 🚛`;
            return await this.sendMetaCloudMessage(phone, fallbackMsg);
        }
    }

    /**
     * Send Order Status Notification via WhatsApp Bot Automation (with Direct Meta Fallback)
     */
    async sendStatusNotification(order, user, status) {
        const phone = user?.whatsapp || user?.phone || order.deliveryAddress?.phone;
        if (!phone) return;

        const botUrl = process.env.WHATSAPP_BOT_URL || 'https://whatapp-automation-kxml.onrender.com';
        const trackingLink = `https://mansarafoods.com/order-tracking/${order.orderId}`;

        console.log(`[WHATSAPP SERVICE] Sending Status Notification (#${order.orderId} -> ${status}) to ${phone}...`);

        try {
            await axios.post(`${botUrl}/api/notify-customer-status`, {
                phone,
                orderId: order.orderId,
                status: status || order.orderStatus,
                trackingLink
            }, { timeout: 5000 });
            console.log(`[WHATSAPP SERVICE] ✓ Customer status notification sent via Bot API`);
            return { success: true };
        } catch (err) {
            console.warn('[WHATSAPP SERVICE] Bot API error on status notification. Falling back to direct Meta text...', err.message);
            let message = `Hi! Your order *#${order.orderId}* status has been updated to: *${status}*.`;
            if (status === 'Shipped') {
                message += `\n\nYour healthy goodies are on the way! 🚛💨\nTrack here: ${trackingLink}`;
            } else if (status === 'Delivered') {
                message += `\n\nYour order has been delivered! Hope you enjoy your Mansara experience. ✨`;
            } else if (status === 'Cancelled') {
                message += `\n\nYour order has been cancelled.`;
            }
            return await this.sendMetaCloudMessage(phone, message);
        }
    }

    /**
     * Send Product Review Request via WhatsApp Bot Automation (with Direct Meta Fallback)
     */
    async sendReviewRequest(order, user) {
        const phone = user?.whatsapp || user?.phone || order.deliveryAddress?.phone;
        if (!phone) return;

        const botUrl = process.env.WHATSAPP_BOT_URL || 'https://whatapp-automation-kxml.onrender.com';
        const custName = user?.name || order.deliveryAddress?.firstName || 'Valued Customer';
        const itemsList = (order.items || []).map(i => i.name);

        console.log(`[WHATSAPP SERVICE] Sending Review Request (#${order.orderId}) to ${phone}...`);

        try {
            await axios.post(`${botUrl}/api/notify-customer-review`, {
                phone,
                orderId: order.orderId,
                customerName: custName,
                items: itemsList
            }, { timeout: 5000 });
            console.log(`[WHATSAPP SERVICE] ✓ Customer review request sent via Bot API`);
            return { success: true };
        } catch (err) {
            console.warn('[WHATSAPP SERVICE] Bot API error on review request. Falling back to direct Meta text...', err.message);
            const fallbackMsg = `Namaste ${custName}! 🙏\n\n⭐ *How was your order #${order.orderId}?*\n\nYour order has been delivered! 🎉 We'd love to know what you think about our organic foods.\n\nPlease write a review: https://mansarafoods.com/account/orders\n\nThank you for your support! 🌿`;
            return await this.sendMetaCloudMessage(phone, fallbackMsg);
        }
    }

    /**
     * Send Welcome Message via WhatsApp Bot Automation (with Direct Meta Fallback)
     */
    async sendWelcomeMessage(user) {
        const phone = user?.whatsapp || user?.phone;
        if (!phone) return;

        const botUrl = process.env.WHATSAPP_BOT_URL || 'https://whatapp-automation-kxml.onrender.com';
        const custName = user?.name || 'Valued Customer';

        console.log(`[WHATSAPP SERVICE] Sending Welcome Message to ${phone}...`);

        try {
            await axios.post(`${botUrl}/api/notify-customer-welcome`, {
                phone,
                customerName: custName
            }, { timeout: 5000 });
            console.log(`[WHATSAPP SERVICE] ✓ Customer welcome message sent via Bot API`);
            return { success: true };
        } catch (err) {
            console.warn('[WHATSAPP SERVICE] Bot API error on welcome message. Falling back to direct Meta text...', err.message);
            const fallbackMsg = `Namaste ${custName}! 🙏\n\n🌿 *Welcome to Mansara Foods!* 🌿\n\nWe bring pure, traditional, and healthy food products directly to your doorstep.\n\n🎁 Use code *WELCOME10* for 10% OFF on your first purchase!\n\nShop online: https://mansarafoods.com`;
            return await this.sendMetaCloudMessage(phone, fallbackMsg);
        }
    }

    /**
     * Send Custom Admin-to-Customer Message via WhatsApp Bot Automation
     */
    async sendCustomMessage(order, user, messageContent) {
        const phone = user?.whatsapp || user?.phone || order?.deliveryAddress?.phone;
        if (!phone) return;

        const botUrl = process.env.WHATSAPP_BOT_URL || 'https://whatapp-automation-kxml.onrender.com';
        const custName = user?.name || order?.deliveryAddress?.firstName || 'Customer';

        console.log(`[WHATSAPP SERVICE] Sending Custom Message to ${phone}...`);

        try {
            await axios.post(`${botUrl}/api/notify-customer-custom`, {
                phone,
                customerName: custName,
                orderId: order?.orderId || '',
                messageText: messageContent
            }, { timeout: 5000 });
            console.log(`[WHATSAPP SERVICE] ✓ Custom customer message sent via Bot API`);
            return { success: true };
        } catch (err) {
            console.warn('[WHATSAPP SERVICE] Bot API error on custom message. Falling back to direct Meta text...', err.message);
            const fallbackMsg = `Hi ${custName}! 🌿\n\n${messageContent}\n\nOrder ID: ${order?.orderId || 'N/A'}`;
            return await this.sendMetaCloudMessage(phone, fallbackMsg);
        }
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
}

module.exports = new WhatsAppService();
