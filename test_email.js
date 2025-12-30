const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const sendTestEmail = async () => {
    console.log('Testing Email Sending...');
    console.log(`User: ${process.env.EMAIL_USER}`);
    // Don't log full password
    console.log(`Pass length: ${process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0}`);

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    try {
        const info = await transporter.verify();
        console.log('Server is ready to take our messages');
        console.log('SMTP Config verification success:', info);

        // Try sending to self
        const message = {
            from: `${process.env.EMAIL_FROM} <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to self
            subject: 'Test Email from Localhost',
            text: 'This is a test email to verify SMTP configuration.',
        };

        const result = await transporter.sendMail(message);
        console.log('Test email sent successfully. Message ID:', result.messageId);

    } catch (error) {
        console.error('Error sending test email:', error);
    }
};

sendTestEmail();
