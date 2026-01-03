const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const TempUser = require('../models/TempUser');
const crypto = require('crypto');
const { protect } = require('../middleware/authMiddleware');
const { OAuth2Client } = require('google-auth-library');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ========================================
// HELPER FUNCTIONS
// ========================================

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// ========================================
// REGISTER USER
// ========================================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, whatsapp } = req.body;

        if (!whatsapp) {
            return res.status(400).json({ message: 'WhatsApp number is required' });
        }

        const userExists = await User.findOne({ email }).lean().exec();
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        await TempUser.findOneAndDelete({ email });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

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
// LOGIN
// ========================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email })
            .select('+password')
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
// GOOGLE OAUTH (FIXED!)
// ========================================
// ========================================
// GOOGLE OAUTH (FULLY FIXED VERSION)
// ========================================
router.post('/google', async (req, res) => {
    try {
        const { credential, email: bodyEmail, name: bodyName, mode } = req.body;

        console.log('[Google Auth] Request received:', { email: bodyEmail, name: bodyName, mode });

        // Verify the Google token
        let ticket;
        try {
            ticket = await googleClient.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
        } catch (verifyError) {
            console.error('[Google Auth] Token verification failed:', verifyError);
            return res.status(401).json({
                success: false,
                message: 'Invalid Google token'
            });
        }

        const payload = ticket.getPayload();

        // Strict Audience Check
        if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token audience'
            });
        }

        // Use verified values from payload
        const email = payload.email;
        const name = payload.name;
        const picture = payload.picture;
        const googleId = payload.sub;

        console.log('[Google Auth] Payload verified:', { email, googleId });

        // 1. Check if user with this Google ID exists (PRIORITY)
        let user = await User.findOne({ googleId });

        if (user) {
            console.log('[Google Auth] Existing Google user signed in:', user.email);
        } else {
            // 2. Check if user with this email exists
            user = await User.findOne({ email });

            if (user) {
                console.log('[Google Auth] Existing email user signing in:', email);
                // ✅ FIXED: Update without triggering password middleware
                await User.updateOne(
                    { _id: user._id },
                    { 
                        $set: { 
                            googleId,
                            picture,
                            authProvider: 'google',
                            isVerified: true,
                            avatar: picture || user.avatar,
                            lastLogin: new Date()
                        }
                    }
                );
                // Refresh user object
                user = await User.findById(user._id);
            } else {
                // 3. Create new Google user (NO PASSWORD)
                console.log('[Google Auth] Creating new Google user:', email);
                user = new User({
                    email,
                    name,
                    picture,
                    avatar: picture,
                    googleId,
                    authProvider: 'google',
                    isVerified: true,
                    role: 'user',
                    status: 'Active',
                    lastLogin: new Date()
                });

                // ✅ FIXED: Save new user (no password = middleware skips)
                await user.save();
                console.log('[Google Auth] New user created:', email);
            }
        }

        // Update last login (safe - no password field touched)
        await User.updateOne(
            { _id: user._id },
            { lastLogin: new Date() }
        );

        // Generate JWT token
        const token = jwt.sign(
            {
                id: user._id,
                userId: user._id,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Return success response
        res.json({
            success: true,
            message: 'Authentication successful',
            token,
            user: {
                _id: user._id,
                id: user._id,
                email: user.email,
                name: user.name,
                phone: user.phone || '',
                whatsapp: user.whatsapp || '',
                picture: user.picture,
                avatar: user.picture || user.avatar,
                role: user.role,
                isVerified: user.isVerified,
            },
        });

    } catch (error) {
        console.error('[Google Auth] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Authentication failed',
            error: error.message
        });
    }
});


// ========================================
// VERIFY EMAIL OTP
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
// RESEND OTP
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
// CHANGE PASSWORD
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
// UPDATE PROFILE
// ========================================
router.put('/profile', protect, async (req, res) => {
    try {
        const updateData = {};

        if (req.body.name) updateData.name = req.body.name;
        if (req.body.phone) updateData.phone = req.body.phone;
        if (req.body.whatsapp) updateData.whatsapp = req.body.whatsapp;

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
// FORGOT PASSWORD
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

        setImmediate(() => {
            const sendWhatsApp = require('../utils/sendWhatsApp');
            sendWhatsApp(user.whatsapp, message).catch(err => {
                console.error('[ERROR] WhatsApp send failed:', err);
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
// RESET PASSWORD
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
// GET PROFILE
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