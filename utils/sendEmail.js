const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    console.log(`[DEBUG] sendEmail called for: ${options.email}`);

    // Check for email credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('----------------------------------------------------');
        console.log('WARNING: Email credentials not found in .env');

        if (process.env.NODE_ENV === 'production') {
            console.error('CRITICAL: Email sending attempted in PRODUCTION without credentials!');
            throw new Error('Missing EMAIL_USER or EMAIL_PASS in production environment');
        }

        console.log('Skipping email send (Dev Mode). Message preview:');
        console.log(`To: ${options.email}`);
        console.log('----------------------------------------------------');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
        pool: true, // Reuse connections for speed
        maxConnections: 1, // Limit connections (Gmail strict rate limits)
        rateLimit: 3, // Max 3 messages per second
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const message = {
        from: `${process.env.FROM_NAME || 'Support'} <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    const info = await transporter.sendMail(message);

    console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
