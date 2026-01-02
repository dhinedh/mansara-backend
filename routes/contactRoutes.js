const express = require('express');
const router = express.Router();
const Contact = require('../models/Contact');
const { protect, admin } = require('../middleware/authMiddleware');

// ========================================
// POST CONTACT MESSAGE (OPTIMIZED)
// ========================================
router.post('/', async (req, res) => {
    try {
        const { name, email, phone, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ 
                message: 'Name, email, and message are required' 
            });
        }

        const newContact = await Contact.create({
            name,
            email,
            phone,
            message
        });

        // Send confirmation email asynchronously (non-blocking)
        setImmediate(() => {
            try {
                const sendEmail = require('../utils/sendEmail');
                sendEmail({
                    to: email,
                    subject: 'We received your message - Mansara Foods',
                    text: `Dear ${name},\n\nThank you for contacting us. We have received your message and will get back to you shortly.\n\nBest regards,\nMansara Foods Team`
                }).catch(err => console.error('[ERROR] Contact email failed:', err));
            } catch (err) {
                console.error('[ERROR] Email setup failed:', err);
            }
        });

        res.status(201).json({ 
            message: 'Message sent successfully', 
            contact: newContact 
        });
    } catch (error) {
        console.error('[ERROR] Submit contact form:', error);
        res.status(500).json({ message: 'Server error, please try again later' });
    }
});

// ========================================
// GET ALL CONTACT MESSAGES (ADMIN) - OPTIMIZED WITH PAGINATION
// ========================================
router.get('/', protect, admin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;
        const { status, search } = req.query;

        // Build query
        const query = {};
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { message: { $regex: search, $options: 'i' } }
            ];
        }

        const [messages, total] = await Promise.all([
            Contact.find(query)
                .select('-__v')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec(),
            Contact.countDocuments(query)
        ]);

        res.json({
            messages,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('[ERROR] Get contact messages:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// GET SINGLE CONTACT MESSAGE (ADMIN)
// ========================================
router.get('/:id', protect, admin, async (req, res) => {
    try {
        const message = await Contact.findById(req.params.id)
            .lean()
            .exec();

        if (!message) {
            return res.status(404).json({ message: 'Contact message not found' });
        }

        res.json(message);
    } catch (error) {
        console.error('[ERROR] Get contact message:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// UPDATE CONTACT STATUS (ADMIN)
// ========================================
router.put('/:id/status', protect, admin, async (req, res) => {
    try {
        const { status } = req.body;

        const validStatuses = ['new', 'read', 'responded', 'archived'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const message = await Contact.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true, select: '-__v' }
        ).lean().exec();

        if (!message) {
            return res.status(404).json({ message: 'Contact message not found' });
        }

        res.json(message);
    } catch (error) {
        console.error('[ERROR] Update contact status:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// DELETE CONTACT MESSAGE (ADMIN)
// ========================================
router.delete('/:id', protect, admin, async (req, res) => {
    try {
        const message = await Contact.findByIdAndDelete(req.params.id);

        if (!message) {
            return res.status(404).json({ message: 'Contact message not found' });
        }

        res.json({ message: 'Contact message deleted successfully' });
    } catch (error) {
        console.error('[ERROR] Delete contact message:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;