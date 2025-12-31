const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    console.log(`[DEBUG] sendEmail called for: ${options.email}`);

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Missing EMAIL_USER or EMAIL_PASS');
    }

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: Number(process.env.EMAIL_PORT),
        secure: false,
        auth: {
            user: process.env.EMAIL_USER, // SMTP login only
            pass: process.env.EMAIL_PASS,
        },
    });

    const message = {
        from: `"Mansarafoods" <${process.env.EMAIL_FROM}>`, // ✅ FIX
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html,
    };

    const info = await transporter.sendMail(message);
    console.log('Message sent:', info.messageId);
};

module.exports = sendEmail;
