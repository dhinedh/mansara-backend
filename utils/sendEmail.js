const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    console.log(`[DEBUG] sendEmail called for: ${options.email}`);

    // Check for email credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log('----------------------------------------------------');
        console.log('WARNING: Email credentials not found in .env');
        console.log(`Current User: ${process.env.EMAIL_USER}`);
        console.log(`Current Pass length: ${process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0}`);
        console.log('Skipping email send. Here is the message:');
        console.log(`To: ${options.email}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Message: ${options.message}`);
        console.log('----------------------------------------------------');
        return; // Treat as success for dev
    }

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false, // true for 465, false for other ports
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
