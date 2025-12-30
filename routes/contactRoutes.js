const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');

// POST /api/contact - Submit a new contact message
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ message: 'Name, email, and message are required' });
        }

        const newContact = new Contact({
            name,
            email,
            phone,
            message
        });

        const savedContact = await newContact.save();
        res.status(201).json({ message: 'Message sent successfully', contact: savedContact });
    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.status(500).json({ message: 'Server error, please try again later' });
    }
});

// GET /api/contact - Get all messages (Admin only - TODO: Add auth middleware)
router.get('/', async (req, res) => {
    try {
        const messages = await Contact.find().sort({ createdAt: -1 });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
