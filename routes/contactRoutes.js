const express = require('express');
const router = express.Router();
const sendEmail = require('../utils/sendEmail');

// @desc    Send contact form email
// @route   POST /api/contact
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Please fill in all required fields' });
        }

        const adminEmail = process.env.EMAIL_FEEDBACK_TO || process.env.EMAIL_FROM;

        const emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #2c3e50;">New Contact Form Submission</h2>
                <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Subject:</strong> ${subject || 'General Inquiry'}</p>
                </div>
                <h3 style="color: #2c3e50; margin-top: 20px;">Message:</h3>
                <p style="background-color: #fff; padding: 15px; border: 1px solid #eee; border-radius: 5px; white-space: pre-wrap;">${message}</p>
                <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #7f8c8d;">Received from Mansara Foods Website</p>
            </div>
        `;

        await sendEmail({
            email: adminEmail,
            subject: `New Message from ${name}: ${subject || 'Contact Form'}`,
            html: emailContent,
            replyTo: email
        });

        res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Contact Email Error:', error);
        res.status(500).json({ message: 'Failed to send message' });
    }
});

module.exports = router;