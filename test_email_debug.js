require('dotenv').config();
const nodemailer = require('nodemailer');

async function verifyEmailConfig() {
    console.log("Testing Email Configuration...");
    console.log("User:", process.env.EMAIL_USER);
    console.log("Host:", process.env.EMAIL_HOST);

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: process.env.EMAIL_PORT || 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
        debug: true, // Enable debug output
        logger: true // Log information to console
    });

    try {
        await transporter.verify();
        console.log("✅ Server connection successful! Credentials are likely correct.");

        // Try sending a test email to self
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Send to self
            subject: "Test Email from Debug Script",
            text: "If you receive this, email sending is working."
        });
        console.log("✅ Test email sent:", info.messageId);

    } catch (error) {
        console.error("❌ Email Error:", error);
    }
}

verifyEmailConfig();
