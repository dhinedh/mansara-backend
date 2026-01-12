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
        const baseUrl = process.env.FRONTEND_URL || 'https://mansarafoods.com';
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

    // Helper to format currency
    _formatCurrency: (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount);
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
                if (!user.email) {
                    console.log('[ℹ] No email address available');
                    return;
                }

                try {
                    const emailMessage = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                
                                <!-- Header -->
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Order Received! 🎉</h1>
                                </div>

                                <!-- Content -->
                                <div style="padding: 30px;">
                                    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi <strong>${user.name}</strong>,</p>
                                    <p style="font-size: 14px; color: #666; line-height: 1.6;">Thank you for your order! We've received it and our team will confirm it shortly. You'll be notified once we start processing your order.</p>
                                    
                                    <!-- Status Box -->
                                    <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
                                        <h3 style="margin: 0 0 10px 0; color: #856404; font-size: 18px;">⏳ Waiting for Confirmation</h3>
                                        <p style="margin: 5px 0; color: #856404;"><strong>Order ID:</strong> ${order.orderId}</p>
                                        <p style="margin: 5px 0; color: #856404;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-IN', { dateStyle: 'full' })}</p>
                                        <p style="margin: 5px 0; color: #856404;"><strong>Payment Method:</strong> ${order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod}</p>
                                    </div>

                                    <!-- Order Details -->
                                    <h3 style="color: #333; margin-top: 30px; margin-bottom: 15px;">Order Details</h3>
                                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                        <thead>
                                            <tr style="background-color: #f8f9fa;">
                                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
                                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
                                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
                                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${invoiceRows}
                                        </tbody>
                                        <tfoot>
                                            <tr style="background-color: #f8f9fa;">
                                                <td colspan="3" style="padding: 15px; text-align: right; font-weight: bold; font-size: 16px;">Grand Total:</td>
                                                <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px; color: #28a745;">₹${order.total}</td>
                                            </tr>
                                        </tfoot>
                                    </table>

                                    <!-- Delivery Address -->
                                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                                        <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">📍 Delivery Address</h3>
                                        <p style="margin: 5px 0; color: #666; line-height: 1.6;">
                                            ${order.deliveryAddress.firstName} ${order.deliveryAddress.lastName || ''}<br>
                                            ${order.deliveryAddress.street}<br>
                                            ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.zip}<br>
                                            📞 ${order.deliveryAddress.phone}
                                        </p>
                                    </div>

                                    <!-- CTA Button -->
                                    <div style="text-align: center; margin: 35px 0;">
                                        <p style="color: #666; margin-bottom: 15px;">We'll notify you once your order is confirmed!</p>
                                        <a href="${trackingLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Track Your Order</a>
                                    </div>
                                </div>

                                <!-- Footer -->
                                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
                                    <p style="margin: 5px 0; color: #666; font-size: 14px;">Thank you for choosing <strong>Mansara Foods</strong> 🌿</p>
                                    <p style="margin: 5px 0; color: #999; font-size: 12px;">Healthy Living, Naturally</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `;

                    await sendEmail({
                        email: user.email,
                        name: user.name,
                        subject: `Order Received - ${order.orderId} | Mansara Foods`,
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

Hi *${user.name}*, your order has been received! ⏳

📋 *Order Details:*
Order ID: *${order.orderId}*
Date: ${new Date().toLocaleDateString('en-IN')}

${order.items.map(item => `• ${item.quantity}x ${item.name} - ₹${item.price * item.quantity}`).join('\n')}

💰 *Total Amount:* ₹${order.total}
💳 *Payment:* ${order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod}

⏳ *Status:* Waiting for Confirmation

📍 *Delivery Address:*
${order.deliveryAddress.firstName} ${order.deliveryAddress.lastName || ''}
${order.deliveryAddress.street}
${order.deliveryAddress.city} - ${order.deliveryAddress.zip}

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
                if (!user.email) {
                    console.log('[ℹ] No email address available');
                    return;
                }

                try {
                    const invoiceRows = order.items.map(item => `
                        <tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px;">${item.name}</td>
                            <td style="padding: 10px; text-align: center;">${item.quantity}</td>
                            <td style="padding: 10px; text-align: right;">₹${item.price * item.quantity}</td>
                        </tr>
                    `).join('');

                    const emailMessage = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                
                                <!-- Header -->
                                <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Order Confirmed! ✅</h1>
                                </div>

                                <!-- Content -->
                                <div style="padding: 30px;">
                                    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi <strong>${user.name}</strong>,</p>
                                    <p style="font-size: 14px; color: #666; line-height: 1.6;">Great news! Your order has been confirmed and is being processed. We'll have it ready for delivery soon! 🎉</p>
                                    
                                    <!-- Status Box -->
                                    <div style="background-color: #d4edda; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
                                        <h3 style="margin: 0 0 10px 0; color: #155724; font-size: 18px;">✅ Order Confirmed</h3>
                                        <p style="margin: 5px 0; color: #155724;"><strong>Order ID:</strong> ${order.orderId}</p>
                                        <p style="margin: 5px 0; color: #155724;"><strong>Status:</strong> Processing</p>
                                        <p style="margin: 5px 0; color: #155724;"><strong>Expected Delivery:</strong> ${formattedDate}</p>
                                    </div>

                                    <!-- Order Items -->
                                    <h3 style="color: #333; margin-top: 30px; margin-bottom: 15px;">Your Items</h3>
                                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                                        <thead>
                                            <tr style="background-color: #f8f9fa;">
                                                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
                                                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
                                                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${invoiceRows}
                                        </tbody>
                                        <tfoot>
                                            <tr style="background-color: #f8f9fa;">
                                                <td colspan="2" style="padding: 15px; text-align: right; font-weight: bold; font-size: 16px;">Grand Total:</td>
                                                <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px; color: #28a745;">₹${order.total}</td>
                                            </tr>
                                        </tfoot>
                                    </table>

                                    <!-- Delivery Address -->
                                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
                                        <h3 style="margin: 0 0 10px 0; color: #333; font-size: 16px;">🚚 Delivery Address</h3>
                                        <p style="margin: 5px 0; color: #666; line-height: 1.6;">
                                            ${order.deliveryAddress.firstName} ${order.deliveryAddress.lastName || ''}<br>
                                            ${order.deliveryAddress.street}<br>
                                            ${order.deliveryAddress.city}, ${order.deliveryAddress.state} - ${order.deliveryAddress.zip}<br>
                                            📞 ${order.deliveryAddress.phone}
                                        </p>
                                    </div>

                                    <!-- CTA Button -->
                                    <div style="text-align: center; margin: 35px 0;">
                                        <p style="color: #666; margin-bottom: 15px;">Track your order anytime!</p>
                                        <a href="${trackingLink}" style="display: inline-block; background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Track Your Order</a>
                                    </div>
                                </div>

                                <!-- Footer -->
                                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
                                    <p style="margin: 5px 0; color: #666; font-size: 14px;">Thank you for choosing <strong>Mansara Foods</strong> 🌿</p>
                                    <p style="margin: 5px 0; color: #999; font-size: 12px;">Healthy Living, Naturally</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `;

                    await sendEmail({
                        email: user.email,
                        name: user.name,
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

                if (!whatsappNumber) {
                    console.log('[ℹ] No WhatsApp number available');
                    return;
                }

                try {
                    const whatsappMessage = `*Mansara Foods* 🌿

✅ *ORDER CONFIRMED!*

Hi *${user.name}*, great news! Your order is confirmed! 🎉

📋 *Order Details:*
Order ID: *${order.orderId}*
Status: *Processing*

${order.items.map(item => `• ${item.quantity}x ${item.name} - ₹${item.price * item.quantity}`).join('\n')}

💰 *Total:* ₹${order.total}
💳 *Payment:* ${order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod}

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

            const statusConfig = {
                'Ordered': { emoji: '📋', color: '#3498db', bg: '#eaf2f8' },
                'Processing': { emoji: '⚙️', color: '#f39c12', bg: '#fef5e7' },
                'Shipped': { emoji: '📦', color: '#9b59b6', bg: '#f4ecf7' },
                'Out for Delivery': { emoji: '🚚', color: '#e67e22', bg: '#fdebd0' },
                'Delivered': { emoji: '✅', color: '#27ae60', bg: '#d5f4e6' },
                'Cancelled': { emoji: '❌', color: '#e74c3c', bg: '#fadbd8' }
            };

            const config = statusConfig[newStatus] || statusConfig['Ordered'];

            // EMAIL NOTIFICATION
            const emailPromise = (async () => {
                if (!user.email) {
                    console.log('[ℹ] No email address available');
                    return;
                }

                try {
                    const emailMessage = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                
                                <!-- Header -->
                                <div style="background-color: ${config.color}; padding: 30px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Order Update ${config.emoji}</h1>
                                </div>

                                <!-- Content -->
                                <div style="padding: 30px;">
                                    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi <strong>${user.name}</strong>,</p>
                                    <p style="font-size: 14px; color: #666; line-height: 1.6;">The status of your order has been updated.</p>
                                    
                                    <!-- Status Box -->
                                    <div style="background-color: ${config.bg}; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid ${config.color}; text-align: center;">
                                        <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Order ID: <strong>${order.orderId}</strong></p>
                                        <h2 style="margin: 0; color: ${config.color}; font-size: 32px;">${newStatus}</h2>
                                    </div>

                                    ${newStatus === 'Shipped' ? `
                                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                        <p style="margin: 0; color: #666; text-align: center;">📦 Your order is on its way!</p>
                                    </div>
                                    ` : ''}

                                    ${newStatus === 'Out for Delivery' ? `
                                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                        <p style="margin: 0; color: #666; text-align: center;">🚚 Your order will be delivered today!</p>
                                    </div>
                                    ` : ''}

                                    ${newStatus === 'Delivered' ? `
                                    <div style="background-color: #d5f4e6; padding: 15px; border-radius: 5px; margin: 20px 0; text-align: center;">
                                        <p style="margin: 0; color: #155724; font-weight: bold;">✅ Your order has been delivered!</p>
                                        <p style="margin: 10px 0 0 0; color: #155724;">Thank you for shopping with us!</p>
                                    </div>
                                    ` : ''}

                                    <!-- CTA Button -->
                                    <div style="text-align: center; margin: 35px 0;">
                                        <a href="${trackingLink}" style="display: inline-block; background-color: ${config.color}; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Track Order</a>
                                    </div>

                                    <p style="font-size: 14px; color: #999; text-align: center;">If you have any questions, feel free to contact us.</p>
                                </div>

                                <!-- Footer -->
                                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
                                    <p style="margin: 5px 0; color: #666; font-size: 14px;">Thank you for choosing <strong>Mansara Foods</strong> 🌿</p>
                                    <p style="margin: 5px 0; color: #999; font-size: 12px;">Healthy Living, Naturally</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `;

                    await sendEmail({
                        email: user.email,
                        name: user.name,
                        subject: `Order Update: ${order.orderId} is ${newStatus}`,
                        html: emailMessage
                    });
                    console.log(`[✓] Status update email sent: ${newStatus}`);
                } catch (err) {
                    console.error('[✗] Email failed:', err.message);
                }
            })();

            // WHATSAPP NOTIFICATION
            const whatsappPromise = (async () => {
                const whatsappNumber = notificationService._getWhatsAppNumber(order, user);
                if (!whatsappNumber) {
                    console.log('[ℹ] No WhatsApp number available');
                    return;
                }

                try {
                    let message = `*Mansara Foods* 🌿\n\n${config.emoji} *Order Status Update*\n\nHi *${user.name}*,\n\nOrder ID: *${order.orderId}*\nNew Status: *${newStatus}*\n\n`;

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
            })();

            await Promise.allSettled([emailPromise, whatsappPromise]);

        } catch (error) {
            console.error('[ERROR] sendOrderStatusUpdate:', error.message);
        }
    },

    // 4. Order Cancelled
    sendOrderCancelled: async (order, user, reason = 'No reason provided') => {
        try {
            const frontendUrl = process.env.FRONTEND_URL || 'https://mansarafoods.com';

            // EMAIL NOTIFICATION
            const emailPromise = (async () => {
                if (!user.email) {
                    console.log('[ℹ] No email address available');
                    return;
                }

                try {
                    const emailMessage = `
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        </head>
                        <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                
                                <!-- Header -->
                                <div style="background-color: #e74c3c; padding: 30px; text-align: center;">
                                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Order Cancelled ❌</h1>
                                </div>

                                <!-- Content -->
                                <div style="padding: 30px;">
                                    <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi <strong>${user.name}</strong>,</p>
                                    <p style="font-size: 14px; color: #666; line-height: 1.6;">Your order <strong>#${order.orderId}</strong> has been cancelled.</p>
                                    
                                    <!-- Reason Box -->
                                    <div style="background-color: #fadbd8; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #e74c3c;">
                                        <h3 style="margin: 0 0 10px 0; color: #c0392b; font-size: 16px;">Cancellation Reason:</h3>
                                        <p style="margin: 0; color: #c0392b;">${reason}</p>
                                    </div>

                                    <p style="font-size: 14px; color: #666; line-height: 1.6;">If you have any questions or concerns, please don't hesitate to contact us.</p>

                                    <!-- CTA Button -->
                                    <div style="text-align: center; margin: 35px 0;">
                                        <a href="${frontendUrl}/contact" style="display: inline-block; background-color: #95a5a6; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Contact Support</a>
                                    </div>
                                </div>

                                <!-- Footer -->
                                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
                                    <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Mansara Foods</strong> 🌿</p>
                                    <p style="margin: 5px 0; color: #999; font-size: 12px;">We hope to serve you again soon!</p>
                                </div>
                            </div>
                        </body>
                        </html>
                    `;

                    await sendEmail({
                        email: user.email,
                        name: user.name,
                        subject: `Order Cancelled: ${order.orderId} | Mansara Foods`,
                        html: emailMessage
                    });
                    console.log('[✓] Cancellation email sent');
                } catch (err) {
                    console.error('[✗] Email failed:', err.message);
                }
            })();

            // WHATSAPP NOTIFICATION
            const whatsappPromise = (async () => {
                const whatsappNumber = notificationService._getWhatsAppNumber(order, user);
                if (!whatsappNumber) {
                    console.log('[ℹ] No WhatsApp number available');
                    return;
                }

                try {
                    const message = `*Mansara Foods* 🌿

❌ *Order Cancelled*

Hi *${user.name}*,

Your order *${order.orderId}* has been cancelled.

*Reason:* ${reason}

If you have any questions, please contact our support.

We hope to serve you again soon! 🙏`;

                    await sendWhatsApp(whatsappNumber, message);
                    console.log('[✓] Cancellation WhatsApp sent');
                } catch (err) {
                    console.error('[✗] WhatsApp failed:', err.message);
                }
            })();

            await Promise.allSettled([emailPromise, whatsappPromise]);

        } catch (error) {
            console.error('[ERROR] sendOrderCancelled:', error.message);
        }
    },

    // 5. Review Alert (Admin)
    sendReviewAlert: async (review, product, user) => {
        try {
            const adminEmail = process.env.EMAIL_FEEDBACK_TO || process.env.EMAIL_FROM;
            const frontendUrl = process.env.FRONTEND_URL || 'https://mansarafoods.com';

            if (!adminEmail) {
                console.log('[ℹ] No admin email configured');
                return;
            }

            const emailMessage = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #f39c12 0%, #f1c40f 100%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">New Product Review ⭐</h1>
                        </div>

                        <!-- Content -->
                        <div style="padding: 30px;">
                            <p style="font-size: 14px; color: #666; margin-bottom: 20px;">A new review has been submitted and is waiting for moderation.</p>
                            
                            <!-- Product Info -->
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                <p style="margin: 5px 0; color: #333;"><strong>Product:</strong> ${product.name}</p>
                                <p style="margin: 5px 0; color: #333;"><strong>User:</strong> ${user.name}</p>
                                <p style="margin: 5px 0; color: #333;"><strong>Email:</strong> ${user.email}</p>
                                <p style="margin: 5px 0; color: #333;"><strong>Rating:</strong> ${'⭐'.repeat(review.rating)} (${review.rating}/5)</p>
                            </div>

                            <!-- Review Comment -->
                            <div style="background-color: #fff9e6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f39c12;">
                                <h3 style="margin: 0 0 10px 0; color: #856404;">Review Comment:</h3>
                                <p style="margin: 0; color: #856404; font-style: italic;">"${review.comment}"</p>
                            </div>

                            <p style="background-color: #fef5e7; padding: 15px; border-radius: 5px; color: #856404; text-align: center; margin: 20px 0;">
                                <strong>Status:</strong> Pending Approval
                            </p>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${frontendUrl}/admin/reviews" style="display: inline-block; background-color: #34495e; color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Moderate Review</a>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
                            <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Mansara Foods Admin</strong> 🌿</p>
                            <p style="margin: 5px 0; color: #999; font-size: 12px;">Review Management System</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            await sendEmail({
                email: adminEmail,
                subject: `New Review for ${product.name} - Rating: ${review.rating}/5`,
                html: emailMessage
            });
            console.log('[✓] Review alert sent to admin');

        } catch (error) {
            console.error('[ERROR] sendReviewAlert:', error.message);
        }
    },

    // 6. Password Reset Email
    sendPasswordReset: async (user, resetToken) => {
        try {
            const frontendUrl = process.env.FRONTEND_URL || 'https://mansarafoods.com';
            const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

            if (!user.email) {
                console.log('[ℹ] No email address available');
                return;
            }

            const emailMessage = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; background-color: #f4f4f4;">
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        
                        <!-- Header -->
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Password Reset Request 🔐</h1>
                        </div>

                        <!-- Content -->
                        <div style="padding: 30px;">
                            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Hi <strong>${user.name}</strong>,</p>
                            <p style="font-size: 14px; color: #666; line-height: 1.6;">We received a request to reset your password. Click the button below to create a new password:</p>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 35px 0;">
                                <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Reset Password</a>
                            </div>

                            <p style="font-size: 14px; color: #666; line-height: 1.6;">Or copy and paste this link into your browser:</p>
                            <p style="font-size: 12px; color: #999; word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 5px;">${resetLink}</p>

                            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                                <p style="margin: 0; color: #856404; font-size: 13px;"><strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request this reset, please ignore this email.</p>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
                            <p style="margin: 5px 0; color: #666; font-size: 14px;"><strong>Mansara Foods</strong> 🌿</p>
                            <p style="margin: 5px 0; color: #999; font-size: 12px;">Healthy Living, Naturally</p>
                        </div>
                    </div>
                </body>
                </html>
            `;

            await sendEmail({
                email: user.email,
                name: user.name,
                subject: 'Password Reset Request - Mansara Foods',
                html: emailMessage
            });
            console.log('[✓] Password reset email sent');

        } catch (error) {
            console.error('[ERROR] sendPasswordReset:', error.message);
        }
    },

    // 7. Stock Alert (Back in Stock)
    sendStockAlert: async (product) => {
        try {
            // Find pending notifications
            const Notification = require('../models/Notification');
            const { sendBulkWhatsApp } = require('./sendWhatsApp');

            const pendingNotifications = await Notification.find({
                product: product._id,
                status: 'pending'
            });

            if (pendingNotifications.length === 0) {
                return 0;
            }

            console.log(`[NOTIFY] Found ${pendingNotifications.length} subscribers for ${product.name}`);

            const messages = pendingNotifications.map(n => ({
                phone: n.whatsapp,
                message: `*Mansara Foods* 🌿\n\nGood news! *${product.name}* is back in stock! 🎉\n\nOrder now before it runs out again!\n\n📦 Order here: ${process.env.FRONTEND_URL || 'https://mansarafoods.com'}/product/${product.slug}`
            }));

            await sendBulkWhatsApp(messages, 500);

            // Mark as sent
            await Notification.updateMany(
                { product: product._id, status: 'pending' },
                { $set: { status: 'sent', sentAt: new Date() } }
            );

            return pendingNotifications.length;

        } catch (error) {
            console.error('[ERROR] sendStockAlert:', error.message);
            return 0;
        }
    }
};

module.exports = notificationService;