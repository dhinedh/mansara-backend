const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { protect } = require('../middleware/authMiddleware');

// Initialize Razorpay
// NOTE: Make sure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are in .env
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});

// ========================================
// CREATE RAZORPAY ORDER
// ========================================
router.post('/create-order', protect, async (req, res) => {
    try {
        const { amount, currency = 'INR' } = req.body;

        if (!amount) {
            return res.status(400).json({ message: 'Amount is required' });
        }

        const options = {
            amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
            currency,
            receipt: `receipt_${Date.now()}`
        };

        const order = await razorpay.orders.create(options);

        res.json(order);
    } catch (error) {
        console.error('[ERROR] Razorpay Create Order:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// VERIFY PAYMENT SIGNATURE
// ========================================
router.post('/verify', protect, async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            res.json({ message: 'Payment verified successfully', verified: true });
        } else {
            res.status(400).json({ message: 'Invalid signature sent!', verified: false });
        }
    } catch (error) {
        console.error('[ERROR] Razorpay Verify:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
