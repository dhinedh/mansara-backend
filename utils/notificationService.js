const sendEmail = require('./sendEmail');
const sendWhatsApp = require('./sendWhatsApp');

// ========================================
// OPTIMIZED NOTIFICATION SERVICE
// ========================================
const notificationService = {
    // Helper to format phone number
    _getWhatsAppNumber: (order, user) => {
        const orderPhone = order?.deliveryAddress?.whatsapp || order?.deliveryAddress?.phone;
        const userPhone = user?.whatsapp || user?.phone;
        return orderPhone || userPhone;
    },

    // Helper to get tracking link
    _getTrackingLink: (orderId) => {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
        return `${baseUrl}/order-tracking/${orderId}`;
    },

    // Helper to format delivery date
    _formatDeliveryDate: (date) => {
        const deliveryDate = date || new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
        return deliveryDate.toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // 1. Order Placed - Waiting for Confirmation
    sendOrderPlaced: async (order, user) => {
        try {
            const trackingLink = notificationService._getTrackingLink(order.orderId);

            // Generate Invoice Table Rows
            const invoiceRows = order.items.map(item => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">${item.name}</td>
                    <td style="padding: 10px; text-align: center;">${item.quantity}</td>
                    <td style="padding: 10px; text-align: right;">₹${item.price}</td>
                    <td style="padding: 10px; text-align: right;">₹${item.price * item.quantity}</td>
                </tr>
            `).join('');

            // Send Email and WhatsApp in parallel (non-blocking)
            const emailPromise = (async () => {
                try {
                    const emailMessage = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                            <h1 style="color: #2c3e50; text-align: center;">Order Received!</h1>
                            <p>Hi ${user.name},</p>
                            <p>Thank you for your order. We're processing it and will confirm shortly.</p>
                            
                            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                                <h3 style="margin-top: 0; color: #856404;">⏳ Waiting for Confirmation</h3>
                                <p><strong>Order ID:</strong> ${order.orderId}</p>
                                <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
                                <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                            </div>

                            <h3>Order Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background-color: #f2f2f2;">
                                        <th style="padding: 10px; text-align: left;">Item</th>
                                        <th style="padding: 10px; text-align: center;">Qty</th>
                                        <th style="padding: 10px; text-align: right;">Price</th>
                                        <th style="padding: 10px; text-align: right;">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${invoiceRows}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Grand Total:</td>
                                        <td style="padding: 10px; text-align: right; font-weight: bold; font-size: 1.1em;">₹${order.total}</td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div style="margin-top: 30px; text-align: center;">
                                <p>We'll notify you once your order is confirmed!</p>
                                <a href="${trackingLink}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Track Your Order</a>
                            </div>
                            
                            <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
                            <p style="font-size: 12px; color: #7f8c8d; text-align: center;">Mansara Foods</p>
                        </div>
                    `;

                    await sendEmail({
                        email: user.email,
                        subject: `Order Received - ${order.orderId}`,
                        html: emailMessage
                    });
                    console.log('[✓] Order placed email sent');
                } catch (err) {
                    console.error('[✗] Email failed:', err.message);
                }
            })();

            const whatsappPromise = (async () => {
                const whatsappNumber = notificationService._getWhatsAppNumber(order, user);

                if (!whatsappNumber) {
                    console.log('[ℹ] No WhatsApp number available');
                    return;
                }

                try {
                    const whatsappMessage = `*Mansara Foods* 🌿

Hi ${user.name}, your order has been received! ⏳

📋 *Order Details:*
Order ID: ${order.orderId}
Date: ${new Date().toLocaleDateString('en-IN')}

${order.items.map(item => `• ${item.quantity}x ${item.name} - ₹${item.price * item.quantity}`).join('\n')}

💰 *Total Amount:* ₹${order.total}
💳 *Payment:* ${order.paymentMethod}

⏳ *Status:* Waiting for Confirmation

We'll notify you once your order is confirmed with delivery details!

📦 Track: ${trackingLink}

Thank you for choosing Mansara Foods! 🙏`;

                    await sendWhatsApp(whatsappNumber, whatsappMessage);
                    console.log('[✓] Order placed WhatsApp sent');
                } catch (err) {
                    console.error('[✗] WhatsApp failed:', err.message);
                }
            })();

            // Wait for both to complete (but don't block the response)
            await Promise.allSettled([emailPromise, whatsappPromise]);

        } catch (error) {
            console.error('[ERROR] sendOrderPlaced:', error.message);
        }
    },

    // 2. Order Confirmed by Admin - With Delivery Time
    sendOrderConfirmed: async (order, user = {}) => {
        try {
            const trackingLink = notificationService._getTrackingLink(order.orderId);
            const formattedDate = notificationService._formatDeliveryDate(order.estimatedDeliveryDate);

            // Send Email and WhatsApp in parallel
            const emailPromise = (async () => {
                try {
                    const emailMessage = `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                            <h1 style="color: #27ae60; text-align: center;">Order Confirmed! ✅</h1>
                            <p>Hi ${user.name},</p>
                            <p>Great news! Your order has been confirmed and is being processed.</p>
                            
                            <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
                                <h3 style="margin-top: 0; color: #155724;">✅ Order Confirmed</h3>
                                <p><strong>Order ID:</strong> ${order.orderId}</p>
                                <p><strong>Status:</strong> Processing</p>
                                <p><strong>Expected Delivery:</strong> ${formattedDate}</p>
                            </div>

                            <h3>Your Items:</h3>
                            <ul>
                                ${order.items.map(item => `<li>${item.quantity}x ${item.name} - ₹${item.price * item.quantity}</li>`).join('')}
                            </ul>
                            <p><strong>Total: ₹${order.total}</strong></p>

                            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                <p><strong>Delivery Address:</strong></p>
                                <p>${order.deliveryAddress.firstName} ${order.deliveryAddress.lastName || ''}<br>
                                ${order.deliveryAddress.street}<br>
                                ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.zip}<br>
                                Phone: ${order.deliveryAddress.phone}</p>
                            </div>

                            <div style="margin-top: 30px; text-align: center;">
                                <a href="${trackingLink}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Track Your Order</a>
                            </div>
                            
                            <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
                            <p style="font-size: 12px; color: #7f8c8d; text-align: center;">Mansara Foods</p>
                        </div>
                    `;

                    await sendEmail({
                        email: user.email,
                        subject: `Order Confirmed - ${order.orderId} | Delivery by ${formattedDate}`,
                        html: emailMessage
                    });
                    console.log('[✓] Order confirmed email sent');
                } catch (err) {
                    console.error('[✗] Email failed:', err.message);
                }
            })();

            const whatsappPromise = (async () => {
                const whatsappNumber = notificationService._getWhatsAppNumber(order, user);

                if (!whatsappNumber) return;

                try {
                    const whatsappMessage = `*Mansara Foods* 🌿

✅ *ORDER CONFIRMED!*

Hi ${user.name}, great news! Your order is confirmed! 🎉

📋 *Order Details:*
Order ID: ${order.orderId}
Status: *Processing*

${order.items.map(item => `• ${item.quantity}x ${item.name} - ₹${item.price * item.quantity}`).join('\n')}

💰 *Total:* ₹${order.total}
💳 *Payment:* ${order.paymentMethod}

🚚 *Delivery Information:*
Expected Delivery: *${formattedDate}*

📍 *Delivering To:*
${order.deliveryAddress.firstName} ${order.deliveryAddress.lastName || ''}
${order.deliveryAddress.street}
${order.deliveryAddress.city} - ${order.deliveryAddress.zip}

📦 Track: ${trackingLink}

We'll keep you updated on your order status!

Thank you for choosing Mansara Foods! 🙏`;

                    await sendWhatsApp(whatsappNumber, whatsappMessage);
                    console.log('[✓] Order confirmed WhatsApp sent');
                } catch (err) {
                    console.error('[✗] WhatsApp failed:', err.message);
                }
            })();

            await Promise.allSettled([emailPromise, whatsappPromise]);

        } catch (error) {
            console.error('[ERROR] sendOrderConfirmed:', error.message);
        }
    },

    // 3. Order Status Update
    sendOrderStatusUpdate: async (order, user, newStatus) => {
        try {
            const trackingLink = notificationService._getTrackingLink(order.orderId);

            const statusEmojis = {
                'Ordered': '📋',
                'Processing': '⚙️',
                'Shipped': '📦',
                'Out for Delivery': '🚚',
                'Delivered': '✅',
                'Cancelled': '❌'
            };

            const emoji = statusEmojis[newStatus] || '📋';
            const whatsappNumber = notificationService._getWhatsAppNumber(order, user);

            if (!whatsappNumber) return;

            try {
                let message = `*Mansara Foods* 🌿\n\n${emoji} *Order Status Update*\n\nHi ${user.name},\n\nOrder ID: ${order.orderId}\nNew Status: *${newStatus}*\n\n`;

                if (newStatus === 'Shipped') {
                    message += `Your order is on its way! 📦\n\n`;
                } else if (newStatus === 'Out for Delivery') {
                    message += `Your order will be delivered today! 🚚\n\n`;
                } else if (newStatus === 'Delivered') {
                    message += `Your order has been delivered! Thank you for shopping with us! ✅\n\n`;
                }

                message += `📦 Track: ${trackingLink}\n\nThank you! 🙏`;

                await sendWhatsApp(whatsappNumber, message);
                console.log(`[✓] Status update WhatsApp sent: ${newStatus}`);
            } catch (err) {
                console.error('[✗] WhatsApp failed:', err.message);
            }

        } catch (error) {
            console.error('[ERROR] sendOrderStatusUpdate:', error.message);
        }
    },

    // 4. Order Cancelled
    sendOrderCancelled: async (order, user) => {
        try {
            const whatsappNumber = notificationService._getWhatsAppNumber(order, user);

            if (!whatsappNumber) return;

            try {
                const message = `*Mansara Foods* 🌿\n\n❌ *Order Cancelled*\n\nHi ${user.name},\n\nYour order ${order.orderId} has been cancelled.\n\nIf you have any questions, please contact our support.\n\nThank you! 🙏`;

                await sendWhatsApp(whatsappNumber, message);
                console.log('[✓] Cancellation WhatsApp sent');
            } catch (err) {
                console.error('[✗] WhatsApp failed:', err.message);
            }

        } catch (error) {
            console.error('[ERROR] sendOrderCancelled:', error.message);
        }
    }
};

module.exports = notificationService;