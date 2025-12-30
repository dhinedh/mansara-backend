require('dotenv').config();
const nodemailer = require('nodemailer');

async function verifyEmailConfig() {
    console.log("STARTING TEST...");

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.log("FAILURE: Missing EMAIL_USER or EMAIL_PASS in .env");
        return;
    }

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
        console.log("Verifying connection...");
        await transporter.verify();
        console.log("SUCCESS: Connection verified.");

        console.log("Sending email...");
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: "Simple Test",
            text: "Working."
        });
        console.log("SUCCESS: Email sent.");

    } catch (error) {
        console.log("FAILURE:", error.message);
        if (error.response) console.log("Response:", error.response);
    }
}

verifyEmailConfig();
