const express = require('express');
const router = express.Router();
const notificationService = require('../utils/notificationService');

// @route   POST /api/contact
// @desc    Send contact form message
// @access  Public
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, message, subject } = req.body;

        // Basic validation
        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Please provide name, email, and message' });
        }

        // Send emails
        await notificationService.sendContactMessage({
            name,
            email,
            phone,
            message,
            subject: subject || 'New Contact Message'
        });

        res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('[ERROR] Contact form:', error);
        res.status(500).json({ message: 'Failed to send message' });
    }
});

module.exports = router;