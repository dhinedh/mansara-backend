const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TempUser = require('../models/TempUser');
const crypto = require('crypto');
const { protect } = require('../middleware/authMiddleware');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// ========================================
// REGISTER USER (OPTIMIZED)
// ========================================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, whatsapp } = req.body;

        if (!whatsapp) {
            return res.status(400).json({ message: 'WhatsApp number is required' });
        }

        // Use lean() for faster query
        const userExists = await User.findOne({ email }).lean().exec();
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Clear previous temp data
        await TempUser.findOneAndDelete({ email });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpire = Date.now() + 10 * 60 * 1000;

        const tempUser = await TempUser.create({
            name,
            email,
            password: hashedPassword,
            phone,
            whatsapp,
            otp,
            otpExpire,
        });

        if (tempUser) {
            const message = `Your Mansara Foods verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;

            try {
                const sendWhatsApp = require('../utils/sendWhatsApp');
                // Send WhatsApp asynchronously
                setImmediate(() => {
                    sendWhatsApp(whatsapp, message).catch(err => 
                        console.error('[ERROR] WhatsApp send failed:', err)
                    );
                });

                res.status(201).json({
                    email: tempUser.email,
                    whatsapp: tempUser.whatsapp,
                    message: "Registration successful. Please check WhatsApp for OTP."
                });
            } catch (waError) {
                console.error("[ERROR] WhatsApp setup failed", waError);
                await TempUser.findByIdAndDelete(tempUser._id);
                return res.status(500).json({
                    message: 'Failed to send WhatsApp OTP. ' + (waError.message || "Please check number.")
                });
            }
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        console.error('[ERROR] Registration:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// LOGIN (OPTIMIZED)
// ========================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Use select to only get needed fields
        const user = await User.findOne({ email })
            .select('+password') // Explicitly include password
            .lean()
            .exec();

        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        if (!user.isVerified) {
            return res.status(401).json({ message: 'Please verify your email address' });
        }

        // Don't send password back
        delete user.password;

        res.json({
            ...user,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('[ERROR] Login:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// VERIFY EMAIL OTP (OPTIMIZED)
// ========================================
router.post('/verify-email', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const tempUser = await TempUser.findOne({
            email,
            otp,
            otpExpire: { $gt: Date.now() }
        }).lean().exec();

        if (!tempUser) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const newUser = await User.create({
            name: tempUser.name,
            email: tempUser.email,
            password: tempUser.password,
            phone: tempUser.phone,
            whatsapp: tempUser.whatsapp,
            isVerified: true,
            role: 'user'
        });

        await TempUser.findByIdAndDelete(tempUser._id);

        res.json({
            _id: newUser._id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            whatsapp: newUser.whatsapp,
            token: generateToken(newUser._id),
            message: "Account verified successfully."
        });

    } catch (error) {
        console.error('[ERROR] Verify email:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// RESEND OTP (OPTIMIZED)
// ========================================
router.post('/resend-otp', async (req, res) => {
    const { email } = req.body;
    try {
        const [existingUser, tempUser] = await Promise.all([
            User.findOne({ email }).lean().exec(),
            TempUser.findOne({ email })
        ]);

        if (existingUser) {
            return res.status(400).json({ message: 'User already registered and verified.' });
        }

        if (!tempUser) {
            return res.status(404).json({ message: 'User not found. Please register again.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpire = Date.now() + 10 * 60 * 1000;

        tempUser.otp = otp;
        tempUser.otpExpire = otpExpire;
        await tempUser.save();

        const message = `Your Mansara Foods verification code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;

        // Send WhatsApp asynchronously
        setImmediate(() => {
            const sendWhatsApp = require('../utils/sendWhatsApp');
            sendWhatsApp(tempUser.whatsapp, message).catch(err => 
                console.error('[ERROR] WhatsApp send failed:', err)
            );
        });

        res.json({ message: "OTP resent successfully to WhatsApp" });

    } catch (error) {
        console.error('[ERROR] Resend OTP:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// CHANGE PASSWORD (OPTIMIZED)
// ========================================
router.put('/change-password', protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Please provide current and new password' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters long' });
        }

        const user = await User.findById(req.user._id).select('+password');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid current password' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();
        
        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('[ERROR] Change password:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// UPDATE PROFILE (OPTIMIZED)
// ========================================
router.put('/profile', protect, async (req, res) => {
    try {
        const updateData = {};
        
        if (req.body.name) updateData.name = req.body.name;
        if (req.body.phone) updateData.phone = req.body.phone;
        if (req.body.whatsapp) updateData.whatsapp = req.body.whatsapp;

        // Check if email is being updated
        if (req.body.email && req.body.email !== req.user.email) {
            const emailExists = await User.findOne({ email: req.body.email }).lean().exec();
            if (emailExists) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            updateData.email = req.body.email;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, select: '-password' }
        ).lean().exec();

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            ...updatedUser,
            token: generateToken(updatedUser._id),
        });
    } catch (error) {
        console.error('[ERROR] Update profile:', error);
        res.status(500).json({ message: error.message });
    }
});

// ========================================
// FORGOT PASSWORD (OPTIMIZED)
// ========================================
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ message: 'Please provide an email address' });
        }

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'No account found with this email address' });
        }

        if (!user.whatsapp) {
            return res.status(400).json({ 
                message: 'No WhatsApp number registered with this account. Please contact support.' 
            });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const resetPasswordToken = crypto.createHash('sha256').update(otp).digest('hex');

        user.resetPasswordToken = resetPasswordToken;
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
        await user.save();

        const message = `Your Mansara Foods password reset code is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;

        // Send WhatsApp asynchronously
        setImmediate(() => {
            const sendWhatsApp = require('../utils/sendWhatsApp');
            sendWhatsApp(user.whatsapp, message).catch(err => {
                console.error('[ERROR] WhatsApp send failed:', err);
                // Clear token if send fails
                User.findByIdAndUpdate(user._id, {
                    $unset: { resetPasswordToken: 1, resetPasswordExpire: 1 }
                }).exec();
            });
        });

        res.status(200).json({ 
            success: true, 
            message: 'Password reset OTP has been sent to your registered WhatsApp number' 
        });
    } catch (error) {
        console.error('[ERROR] Forgot password:', error);
        res.status(500).json({ message: 'Server error. Please try again later.' });
    }
});

// ========================================
// RESET PASSWORD (OPTIMIZED)
// ========================================
router.put('/reset-password', async (req, res) => {
    const { email, otp, password } = req.body;

    if (!email || !otp || !password) {
        return res.status(400).json({ 
            message: 'Please provide email, OTP, and new password' 
        });
    }

    if (password.length < 6) {
        return res.status(400).json({ 
            message: 'Password must be at least 6 characters long' 
        });
    }

    const resetPasswordToken = crypto.createHash('sha256').update(otp).digest('hex');

    try {
        const user = await User.findOne({
            email,
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({ 
                message: 'Invalid or expired OTP. Please request a new one.' 
            });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully. You can now login with your new password.',
            token: generateToken(user._id)
        });
    } catch (error) {
        console.error('[ERROR] Reset password:', error);
        res.status(500).json({ message: 'Server error during password reset. Please try again.' });
    }
});

// ========================================
// GET PROFILE (OPTIMIZED)
// ========================================
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id)
            .select('-password -__v')
            .lean()
            .exec();
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('[ERROR] Get profile:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;