const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            otp,
            otpExpire,
            isVerified: false // Default is false
        });

        if (user) {
            // Send OTP Email
            const message = `
                <h1>Email Verification</h1>
                <p>Your OTP for email verification is: <strong>${otp}</strong></p>
                <p>This OTP expires in 10 minutes.</p>
            `;

            // Send OTP Email asynchronously (using existing message variable)
            console.log(`[DEBUG] Attempting to send OTP email to: ${user.email} (Async)`);
            sendEmail({
                email: user.email,
                subject: 'Email Verification OTP',
                message: `Your OTP is ${otp}`,
                html: message
            }).then(() => {
                console.log(`[DEBUG] OTP email sent successfully to: ${user.email}`);
            }).catch(error => {
                console.error("[DEBUG] Failed to send OTP email", error);
            });

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isVerified: user.isVerified,
                // No token returned - user must verify first
                message: "Registration successful. Please verify your email."
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {

            if (!user.isVerified) {
                return res.status(401).json({ message: 'Please verify your email address' });
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                whatsapp: user.whatsapp,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Verify Email OTP
// @route   POST /api/auth/verify-email
// @access  Public
router.post('/verify-email', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await User.findOne({
            email,
            otp,
            otpExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpire = undefined;
        await user.save();

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
            message: "Email verified successfully"
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
router.post('/resend-otp', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isVerified) {
            return res.status(400).json({ message: 'User already verified' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        user.otp = otp;
        user.otpExpire = otpExpire;
        await user.save();

        // Send OTP Email
        const message = `
         <h1>Email Verification</h1>
         <p>Your new OTP for email verification is: <strong>${otp}</strong></p>
         <p>This OTP expires in 10 minutes.</p>
     `;

        // Send OTP Email asynchronously
        const message = `
         <h1>Email Verification</h1>
         <p>Your new OTP for email verification is: <strong>${otp}</strong></p>
         <p>This OTP expires in 10 minutes.</p>
     `;

        console.log(`[DEBUG] Resending OTP to: ${user.email} (Async)`);
        sendEmail({
            email: user.email,
            subject: 'Email Verification OTP (Resend)',
            message: `Your OTP is ${otp}`,
            html: message
        }).catch(err => console.error("Failed to send OTP", err));

        res.json({ message: "OTP resent successfully" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

const { protect } = require('../middleware/authMiddleware');

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user._id);

        if (user && (await bcrypt.compare(currentPassword, user.password))) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newPassword, salt);
            await user.save();
            res.json({ message: 'Password updated successfully' });
        } else {
            res.status(401).json({ message: 'Invalid current password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (user) {
            user.name = req.body.name || user.name;
            user.phone = req.body.phone || user.phone;
            user.whatsapp = req.body.whatsapp || user.whatsapp;

            console.log('DEBUG: Updating Profile. Body:', req.body);
            console.log('DEBUG: Updated User Object:', { phone: user.phone, whatsapp: user.whatsapp });

            // Check if email is being updated and if it's already taken
            if (req.body.email && req.body.email !== user.email) {
                const emailExists = await User.findOne({ email: req.body.email });
                if (emailExists) {
                    return res.status(400).json({ message: 'Email already in use' });
                }
                user.email = req.body.email;
            }

            const updatedUser = await user.save();

            res.json({
                _id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                whatsapp: updatedUser.whatsapp,
                role: updatedUser.role,
                token: generateToken(updatedUser._id),
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;

// @desc    Forgot Password (OTP)
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash OTP and store in resetPasswordToken (reusing field)
        const resetPasswordToken = crypto
            .createHash('sha256')
            .update(otp)
            .digest('hex');

        // Set expire
        user.resetPasswordToken = resetPasswordToken;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        await user.save();

        const message = `
            <h1>Password Reset OTP</h1>
            <p>Your OTP to reset your password is: <strong>${otp}</strong></p>
            <p>This OTP expires in 10 minutes.</p>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Password Reset OTP',
                message: `Your OTP is ${otp}`,
                html: message
            });

            res.status(200).json({ success: true, data: 'OTP sent to email' });
        } catch (error) {
            console.error(error);
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;

            await user.save();

            return res.status(500).json({ message: 'Email could not be sent' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// @desc    Reset Password (verify OTP)
// @route   PUT /api/auth/reset-password
// @access  Public
router.put('/reset-password', async (req, res) => {
    const { email, otp, password } = req.body;

    // Hash the entered OTP to compare
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(otp)
        .digest('hex');

    try {
        const user = await User.findOne({
            email,
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid OTP or expired' });
        }

        // Set new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(201).json({
            success: true,
            data: 'Password Updated Success',
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: 'Server error during password reset' });
    }
});
