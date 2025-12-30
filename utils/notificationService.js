const sendEmail = require('./sendEmail');

const notificationService = {
    sendOrderConfirmation: async (order, user) => {
        try {
            const trackingLink = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/order-tracking/${order.orderId}`;

            // Calculate estimated delivery (e.g., 5 days from now)
            const deliveryDate = new Date();
            deliveryDate.setDate(deliveryDate.getDate() + 5);
            const formattedDate = deliveryDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            // Generate Invoice Table Rows
            const invoiceRows = order.items.map(item => `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding: 10px;">${item.name}</td>
                    <td style="padding: 10px; text-align: center;">${item.quantity}</td>
                    <td style="padding: 10px; text-align: right;">₹${item.price}</td>
                    <td style="padding: 10px; text-align: right;">₹${item.price * item.quantity}</td>
                </tr>
            `).join('');

            // 1. Send Email (Order + Payment + Invoice)
            const emailMessage = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h1 style="color: #2c3e50; text-align: center;">Order Confirmed!</h1>
                    <p>Hi ${user.name},</p>
                    <p>Thank you for shopping with <strong>Mansara Nourish Hub</strong>. Your order has been placed successfully.</p>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="margin-top: 0; color: #27ae60;">Payment Alert: ${order.paymentStatus === 'Paid' ? 'Payment Received ✅' : 'Payment Pending (COD) ⏳'}</h3>
                        <p><strong>Order ID:</strong> ${order.orderId}</p>
                        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                    </div>

                    <h3>Invoice Details</h3>
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
                        <p>Your order is expected to be delivered by <strong>${formattedDate}</strong>.</p>
                        <a href="${trackingLink}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Track Your Order</a>
                    </div>
                    
                    <hr style="margin-top: 40px; border: none; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #7f8c8d; text-align: center;">Mansara Nourish Hub &bull; 123 Healthy Way, Wellness City</p>
                </div>
`;

            await sendEmail({
                email: user.email,
                subject: `Order & Payment Confirmation - ${order.orderId}`,
                message: `Thank you for your order ${order.orderId}. Total: ₹${order.total}. Track it here: ${trackingLink}`,
                html: emailMessage
            });

            // 2. Send SMS (Mock)
            const paymentStatusMsg = order.paymentStatus === 'Paid' ? 'Paid' : 'Pending';
            const smsMessage = `Mansara: Hi ${user.name}, Order ${order.orderId} Confirmed! Payment: ${paymentStatusMsg}. Total: ₹${order.total}. Delivery by ${formattedDate}. Track: ${trackingLink}`;
            await notificationService.sendSMS(user.phone, smsMessage);

            // 3. Send WhatsApp (Mock)
            const whatsappMessage = `*Mansara Nourish Hub*\n\nHi ${user.name}, your order *${order.orderId}* is confirmed! 🎉\n\n🧾 *Invoice Summary:*\nTotal Amount: ₹${order.total}\nPayment Status: *${paymentStatusMsg}*\nPayment Method: ${order.paymentMethod}\n\n🚚 *Delivery:* ${formattedDate}\n\n📦 *Track Order:* ${trackingLink}\n\nThank you for choosing us!`;
            await notificationService.sendWhatsApp(user.phone, whatsappMessage);

            console.log(`[Notification] Notifications(Invoice / Payment) sent for Order ${order.orderId}`);

        } catch (error) {
            console.error('[Notification] Error sending notifications:', error);
            // Don't block the main thread or error out the request
        }
    },

    sendSMS: async (phone, message) => {
        // Integrate with SMS provider here (e.g., Twilio, MSG91)
        console.log('\n--- 📱 SENDING SMS ---');
        console.log(`To: ${phone || 'No Phone provided'} `);
        console.log(`Message: ${message} `);
        console.log('----------------------\n');
        return Promise.resolve();
    },

    sendWhatsApp: async (phone, message) => {
        // Integrate with WhatsApp provider here (e.g., Twilio, WATI)
        console.log('\n--- 💬 SENDING WHATSAPP ---');
        console.log(`To: ${phone || 'No Phone provided'} `);
        console.log(`Message: ${message} `);
        console.log('----------------------\n');
        return Promise.resolve();
    }
};

module.exports = notificationService;
