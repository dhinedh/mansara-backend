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
        if (clean.length > 10 && clean.length <= 15) return clean;
        return '';
    }

    /**
     * Send approved WhatsApp Utility Template to bypass Meta's 24-Hour Messaging Policy
    /**
     * Send approved WhatsApp Utility Template to bypass Meta's 24-Hour Messaging Policy
     */
    async sendUtilityTemplate(phone, templateName = 'sales_team_alert', languageCode = 'en_US', bodyParameters = []) {
        const token = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN || this.token;
        const phoneId = process.env.META_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID || this.phoneId;
        const normalizedPhone = this._normalizePhone(phone);

        if (!token || !phoneId) {
            console.warn('[WHATSAPP SERVICE] Missing Meta API credentials for Utility Template');
            return { success: false, error: 'Missing credentials' };
        }

        if (!normalizedPhone || normalizedPhone.length < 10) {
            console.warn(`[WHATSAPP SERVICE] Aborting send: Phone number '${phone}' is invalid/malformed`);
            return { success: false, error: 'Malformed phone number' };
        }

        console.log(`[WHATSAPP SERVICE] Sending Utility Template (${templateName}, ${languageCode}) to ${normalizedPhone}...`);

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
            leadData.companyName || 'Mansara Foods Prospect',
            leadData.phone || phone,
            leadData.requirement || leadData.message || 'Product Inquiry / Lead'
        ];
        return await this.sendUtilityTemplate(phone, 'sales_team_alert', 'en_US', params);
    }

    /**
     * Direct WhatsApp Cloud API delivery via Meta Utility Templates (No 'Hi' message required from customer/admin)
     */
    async sendMetaCloudMessage(phone, text, templateName = null) {
        const token = process.env.META_ACCESS_TOKEN || process.env.ACCESS_TOKEN || this.token;
        const phoneId = process.env.META_PHONE_NUMBER_ID || process.env.PHONE_NUMBER_ID || this.phoneId;
        const normalizedPhone = this._normalizePhone(phone);

        if (!token || !phoneId) {
            console.warn('[WHATSAPP SERVICE] Missing Meta API credentials (META_ACCESS_TOKEN / META_PHONE_NUMBER_ID)');
            return { success: false, error: 'Missing credentials' };
        }

        console.log(`[WHATSAPP SERVICE] Delivering direct Meta Cloud message to ${normalizedPhone}...`);

        const sanitizedText = text ? text.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500) : 'Notification Alert';
        try {
            const targetTemplate = templateName || 'universal_notification';
            if (targetTemplate === 'universal_notification') {
                return await this.sendUtilityTemplate(normalizedPhone, 'universal_notification', 'en_US', [
                    'Customer',
                    'Mansara Foods Alert',
                    sanitizedText,
                    'mansarafoods.com'
                ]);
            }
            return await this.sendUtilityTemplate(normalizedPhone, targetTemplate, 'en_US', [
                'Valued Customer',
                'ALERT',
                'Notification',
                sanitizedText
            ]);
        } catch (templateError) {
            console.warn(`[WHATSAPP SERVICE] Custom template error (${templateError.message}), trying sales_team_alert fallback...`);
            return await this.sendUtilityTemplate(normalizedPhone, 'sales_team_alert', 'en_US', [
                'Valued Customer',
                'Mansara Foods Alert',
                normalizedPhone,
                sanitizedText
            ]);
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

        // 1. Try sending via WhatsApp Bot Automation API (3s timeout)
        try {
            const response = await axios.post(`${botUrl}/api/send-otp`, {
                phone: normalizedPhone,
                otp: otp,
                type: type
            }, { timeout: 3000 });

            console.log(`[WHATSAPP SERVICE] ✓ OTP delivered via WhatsApp Bot API:`, response.data);
            return response.data;
        } catch (error) {
            console.warn(`[WHATSAPP SERVICE] Bot API unreachable (${error.message}). Dispatching OTP via Meta Cloud API...`);
        }

        // 2. Direct Meta Cloud API delivery (guaranteed delivery via approved sales_team_alert template)
        const otpDetails = `Your Mansara Foods password reset OTP is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
        return await this.sendUtilityTemplate(normalizedPhone, 'sales_team_alert', 'en_US', [
            'Valued Customer',
            'Password Reset OTP',
            normalizedPhone,
            otpDetails
        ]);
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
            console.warn('[WHATSAPP SERVICE] Bot API error on order confirmation. Falling back to direct Meta Utility Template...', err.message);
            try {
                return await this.sendUtilityTemplate(phone, 'order_status_utility', 'en_US', [
                    custName || 'Valued Customer',
                    order.orderId || 'ORD-2026',
                    'Confirmed & Processing',
                    `Total Amount: ₹${order.total} (${order.paymentMethod || 'Online'}). Delivery to ${fullAddr.slice(0, 50)}`
                ]);
            } catch (tErr) {
                console.warn('[WHATSAPP SERVICE] order_status_utility failed, sending sales_lead_alert...', tErr.message);
                return await this.sendMetaCloudMessage(phone, `Order Confirmed: ${order.orderId}, Total ₹${order.total}`);
            }
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
            return await this.sendUtilityTemplate(phone, 'order_status_utility', 'en_US', [
                user?.name || order.deliveryAddress?.firstName || 'Valued Customer',
                order.orderId || 'ORD-2026',
                status || 'Processing',
                `Track live: ${trackingLink}`
            ]).catch(() => this.sendMetaCloudMessage(phone, message));
        }
    }

    /**
     * Send Order Shipped Notification with Courier & AWB via Meta Utility Template
     */
    async sendOrderShippedNotification(order, user, courier = 'iCarry Express', awb = 'AWB-PENDING') {
        const phone = user?.whatsapp || user?.phone || order.deliveryAddress?.phone;
        if (!phone) return;

        const trackingLink = `https://mansarafoods.com/order-tracking/${order.orderId}`;
        const custName = user?.name || order.deliveryAddress?.firstName || 'Valued Customer';

        console.log(`[WHATSAPP SERVICE] Sending Order Shipped Alert (${order.orderId}, AWB: ${awb}) to ${phone}...`);

        try {
            return await this.sendUtilityTemplate(phone, 'order_shipped_utility', 'en_US', [
                custName,
                order.orderId,
                courier,
                awb,
                trackingLink
            ]);
        } catch (err) {
            console.warn('[WHATSAPP SERVICE] order_shipped_utility failed. Sending status update fallback...', err.message);
            return await this.sendStatusNotification(order, user, 'Shipped');
        }
    }

    /**
     * Send Cart Recovery Nudge via Meta Utility Template
     */
    async sendCartRecoveryNotification(user, cartItemsSummary = 'items', cartTotal = 0) {
        const phone = user?.whatsapp || user?.phone;
        if (!phone) return;

        const checkoutUrl = 'https://mansarafoods.com/checkout';
        const custName = user?.name || 'Valued Customer';

        console.log(`[WHATSAPP SERVICE] Sending Cart Recovery Nudge to ${phone}...`);

        if (cartTotal >= 2000) {
            this.sendAdminHighValueCartAlert(user, cartTotal, cartItemsSummary)
                .catch(err => console.error('[ERROR] Admin High-Value Cart Alert failed:', err));
        }

        try {
            return await this.sendUtilityTemplate(phone, 'cart_recovery_v2', 'en_US', [
                custName,
                cartItemsSummary,
                checkoutUrl
            ]);
        } catch (err) {
            console.warn('[WHATSAPP SERVICE] cart_recovery_utility failed. Sending text fallback...', err.message);
            const msg = `Namaste ${custName}! 🌿\n\nYou left ${cartItemsSummary} in your cart!\nResume checkout here: ${checkoutUrl}`;
            return await this.sendMetaCloudMessage(phone, msg);
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
        const reviewUrl = `https://mansarafoods.com/account/orders`;

        console.log(`[WHATSAPP SERVICE] Sending Review Request (#${order.orderId}) to ${phone}...`);

        // Try direct Meta review_request_utility template first
        try {
            return await this.sendUtilityTemplate(phone, 'review_request_utility', 'en_US', [
                custName,
                order.orderId,
                reviewUrl
            ]);
        } catch (metaErr) {
            console.warn('[WHATSAPP SERVICE] review_request_utility failed, trying Bot API...', metaErr.message);
        }

        try {
            await axios.post(`${botUrl}/api/notify-customer-review`, {
                phone,
                orderId: order.orderId,
                customerName: custName,
                items: (order.items || []).map(i => i.name)
            }, { timeout: 5000 });
            console.log(`[WHATSAPP SERVICE] ✓ Customer review request sent via Bot API`);
            return { success: true };
        } catch (err) {
            console.warn('[WHATSAPP SERVICE] Bot API error on review request. Falling back to direct Meta text...', err.message);
            const fallbackMsg = `Namaste ${custName}! 🙏\n\n⭐ *How was your order #${order.orderId}?*\n\nYour order has been delivered! 🎉 We'd love to know what you think about our organic foods.\n\nPlease write a review: ${reviewUrl}\n\nThank you for your support! 🌿`;
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
     * Send Admin & Sales WhatsApp New Order Notification (to 919342400879 and 918838887064)
     */
    async sendAdminOrderNotification(order, user) {
        const rawPhones = process.env.ADMIN_PHONE || '919342400879,918838887064';
        const adminPhones = rawPhones.split(',').map(p => this._normalizePhone(p.trim())).filter(Boolean);
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

        console.log(`[WHATSAPP SERVICE] Sending Admin & Sales New Order Alert (#${order.orderId}) to ${adminPhones.join(', ')}...`);

        // Send via direct Meta Cloud Utility Template to all Admin & Sales numbers
        const itemsText = itemsList.map(i => `${i.quantity}x ${i.name} (₹${i.price * i.quantity})`).join(', ');
        const eventDetails = `Order ID: ${order.orderId} | Total: ₹${order.total} (${order.paymentMethod || 'COD'}) | Items: ${itemsText} | Quick Action: Reply 'Ship ${order.orderId} iCarry <AWB>' to ship.`;

        for (const phone of adminPhones) {
            try {
                await this.sendUtilityTemplate(phone, 'admin_operations_alert_v1', 'en_US', [
                    'NEW WEBSITE ORDER',
                    `${custName} (${custPhone})`,
                    'HIGH',
                    eventDetails
                ]);
                console.log(`[WHATSAPP SERVICE] ✓ Admin Operations Order Alert delivered to ${phone}`);
            } catch (err) {
                console.warn(`[WHATSAPP SERVICE] admin_operations_alert_v1 failed (${err.message}), falling back...`);
                await this.sendMetaCloudMessage(phone, `Order ${order.orderId} placed by ${custName} (${custPhone}) Total ₹${order.total}`);
            }
        }
    }

    /**
     * Send Admin WhatsApp Low Stock / Out of Stock Alert (to 919342400879 & 918838887064)
     */
    async sendAdminStockAlert(productName, stock) {
        const rawPhones = process.env.ADMIN_PHONE || '919342400879,918838887064';
        const adminPhones = rawPhones.split(',').map(p => this._normalizePhone(p.trim())).filter(Boolean);

        const title = stock <= 0 ? 'OUT OF STOCK CRITICAL ALERT' : 'LOW STOCK ALERT';
        const priority = stock <= 0 ? 'CRITICAL' : 'HIGH';
        const details = stock <= 0
            ? `Stock is 0 items! Restock immediately. Reply 'Restock ${productName} 50' to restock.`
            : `Only ${stock} items remaining. Reply 'Restock ${productName} 50' to add stock.`;

        for (const phone of adminPhones) {
            try {
                await this.sendUtilityTemplate(phone, 'admin_operations_alert_v1', 'en_US', [
                    title,
                    productName,
                    priority,
                    details
                ]);
                console.log(`[WHATSAPP SERVICE] ✓ Admin Stock Alert delivered to ${phone}`);
            } catch (err) {
                console.warn(`[WHATSAPP SERVICE] Admin stock alert fallback: ${err.message}`);
                await this.sendMetaCloudMessage(phone, `${title}: ${productName} (${stock} left)`);
            }
        }
    }

    /**
     * Send Admin WhatsApp Product Review Moderation Alert (to 919342400879 & 918838887064)
     */
    async sendAdminReviewAlert(review, product, user) {
        const rawPhones = process.env.ADMIN_PHONE || '919342400879,918838887064';
        const adminPhones = rawPhones.split(',').map(p => this._normalizePhone(p.trim())).filter(Boolean);

        const prodName = product?.name || 'Mansara Product';
        const userName = user?.name || 'Customer';
        const ratingStars = '⭐'.repeat(review?.rating || 5);
        const comment = review?.comment || review?.text || 'No comment provided';

        for (const phone of adminPhones) {
            try {
                await this.sendUtilityTemplate(phone, 'admin_operations_alert_v1', 'en_US', [
                    'NEW PRODUCT REVIEW PENDING MODERATION',
                    `${prodName} (by ${userName})`,
                    'MEDIUM',
                    `Rating: ${ratingStars} (${review?.rating || 5}/5) | Comment: "${comment}" | Moderate: https://crm.mansarafoods.com/admin/reviews`
                ]);
                console.log(`[WHATSAPP SERVICE] ✓ Admin Review Moderation Alert delivered to ${phone}`);
            } catch (err) {
                console.warn(`[WHATSAPP SERVICE] Admin Review Alert fallback: ${err.message}`);
                await this.sendMetaCloudMessage(phone, `New Review for ${prodName}: ${ratingStars} - "${comment}"`);
            }
        }
    }

    /**
     * Send Admin WhatsApp Customer Support Ticket Alert (to 919342400879 & 918838887064)
     */
    async sendAdminTicketAlert(ticketId, subject, contact) {
        const rawPhones = process.env.ADMIN_PHONE || '919342400879,918838887064';
        const adminPhones = rawPhones.split(',').map(p => this._normalizePhone(p.trim())).filter(Boolean);

        const custName = contact?.name || 'WhatsApp Customer';
        const custPhone = contact?.phone || 'N/A';

        for (const phone of adminPhones) {
            try {
                await this.sendUtilityTemplate(phone, 'admin_operations_alert_v1', 'en_US', [
                    'NEW CUSTOMER SUPPORT TICKET',
                    `${custName} (${custPhone})`,
                    'HIGH',
                    `Ticket ID: ${ticketId} | Subject: "${subject}" | Action: Review ticket in CRM Help Center`
                ]);
                console.log(`[WHATSAPP SERVICE] ✓ Admin Support Ticket Alert delivered to ${phone}`);
            } catch (err) {
                console.warn(`[WHATSAPP SERVICE] Admin Support Ticket Alert fallback: ${err.message}`);
                await this.sendMetaCloudMessage(phone, `New Support Ticket #${ticketId} from ${custName}: "${subject}"`);
            }
        }
    }

    /**
     * Send Admin WhatsApp Order Cancellation / Refund Alert (to 919342400879 & 918838887064)
     */
    async sendAdminCancellationAlert(order, reason = 'Customer Requested', user = null) {
        const rawPhones = process.env.ADMIN_PHONE || '919342400879,918838887064';
        const adminPhones = rawPhones.split(',').map(p => this._normalizePhone(p.trim())).filter(Boolean);

        const custName = user?.name || order?.deliveryAddress?.firstName || 'Customer';
        const custPhone = user?.whatsapp || user?.phone || order?.deliveryAddress?.phone || 'N/A';
        const orderId = order?.orderId || 'ORD-UNKNOWN';
        const total = order?.total || 0;

        for (const phone of adminPhones) {
            try {
                await this.sendUtilityTemplate(phone, 'admin_operations_alert_v1', 'en_US', [
                    'ORDER CANCELLED / REFUND REQUESTED',
                    `${custName} (${custPhone})`,
                    'HIGH',
                    `Order ID: ${orderId} | Refund/Cancel Total: ₹${total} | Reason: "${reason}" | Action: Process refund in Admin Portal`
                ]);
                console.log(`[WHATSAPP SERVICE] ✓ Admin Order Cancellation Alert delivered to ${phone}`);
            } catch (err) {
                console.warn(`[WHATSAPP SERVICE] Admin Cancellation Alert fallback: ${err.message}`);
                await this.sendMetaCloudMessage(phone, `Cancelled Order #${orderId} (₹${total}) by ${custName}. Reason: ${reason}`);
            }
        }
    }

    /**
     * Send Admin WhatsApp High-Value Abandoned Cart Alert (to 919342400879 & 918838887064)
     */
    async sendAdminHighValueCartAlert(user, cartTotal = 0, itemsSummary = 'items') {
        const rawPhones = process.env.ADMIN_PHONE || '919342400879,918838887064';
        const adminPhones = rawPhones.split(',').map(p => this._normalizePhone(p.trim())).filter(Boolean);

        const custName = user?.name || 'Customer';
        const custPhone = user?.whatsapp || user?.phone || 'N/A';

        for (const phone of adminPhones) {
            try {
                await this.sendUtilityTemplate(phone, 'admin_operations_alert_v1', 'en_US', [
                    'HIGH VALUE CART ABANDONED',
                    `${custName} (${custPhone})`,
                    'HIGH',
                    `Cart Total: ₹${cartTotal} | Items: ${itemsSummary} | Action: Contact customer for concierge assistance!`
                ]);
                console.log(`[WHATSAPP SERVICE] ✓ Admin High-Value Cart Alert delivered to ${phone}`);
            } catch (err) {
                console.warn(`[WHATSAPP SERVICE] Admin High-Value Cart Alert fallback: ${err.message}`);
                await this.sendMetaCloudMessage(phone, `High-Value Cart (₹${cartTotal}) abandoned by ${custName} (${custPhone})`);
            }
        }
    }

    /**
     * Send Admin WhatsApp Daily Business Digest / Summary (to 919342400879 & 918838887064)
     */
    async sendAdminDailyDigest(stats = {}) {
        const rawPhones = process.env.ADMIN_PHONE || '919342400879,918838887064';
        const adminPhones = rawPhones.split(',').map(p => this._normalizePhone(p.trim())).filter(Boolean);

        const todayRevenue = stats.todayRevenue || 0;
        const todayOrders = stats.todayOrders || 0;
        const pendingOrders = stats.pendingOrders || 0;
        const lowStockCount = stats.lowStockCount || 0;
        const pendingReviews = stats.pendingReviews || 0;

        const digestDetails = `Today Sales: ₹${todayRevenue} (${todayOrders} orders) | Pending Processing: ${pendingOrders} orders | Low Stock Items: ${lowStockCount} | Pending Reviews: ${pendingReviews}`;

        for (const phone of adminPhones) {
            try {
                await this.sendUtilityTemplate(phone, 'admin_operations_alert_v1', 'en_US', [
                    'DAILY BUSINESS PERFORMANCE DIGEST',
                    'Mansara Foods Store',
                    'MEDIUM',
                    digestDetails
                ]);
                console.log(`[WHATSAPP SERVICE] ✓ Admin Daily Digest delivered to ${phone}`);
            } catch (err) {
                console.warn(`[WHATSAPP SERVICE] Admin Daily Digest fallback: ${err.message}`);
                await this.sendMetaCloudMessage(phone, `Daily Digest: Revenue ₹${todayRevenue}, Orders: ${todayOrders}, Pending: ${pendingOrders}, Low Stock: ${lowStockCount}`);
            }
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
