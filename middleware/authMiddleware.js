const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ========================================
// OPTIMIZED AUTH MIDDLEWARE
// ========================================

/**
 * Protect routes - Verify JWT token
 * @middleware
 */
const protect = async (req, res, next) => {
    try {
        let token;

        // Check for token in Authorization header
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        // If no token, return unauthorized
        if (!token) {
            return res.status(401).json({ 
                message: 'Not authorized, no token provided' 
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from token (exclude password for security)
            // Use lean() for better performance since we just need user data
            const user = await User.findById(decoded.id)
                .select('-password -__v')
                .lean()
                .exec();

            if (!user) {
                return res.status(401).json({ 
                    message: 'Not authorized, user not found' 
                });
            }

            // Check if user is active
            if (user.status === 'Blocked' || user.status === 'Inactive') {
                return res.status(401).json({ 
                    message: 'Account is inactive or blocked' 
                });
            }

            // Attach user to request object
            req.user = user;
            next();

        } catch (error) {
            console.error('[AUTH] Token verification failed:', error.message);
            
            // Specific error messages
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ 
                    message: 'Token expired, please login again' 
                });
            } else if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ 
                    message: 'Invalid token' 
                });
            } else {
                return res.status(401).json({ 
                    message: 'Not authorized, token failed' 
                });
            }
        }

    } catch (error) {
        console.error('[AUTH] Protect middleware error:', error);
        res.status(500).json({ 
            message: 'Server error during authentication' 
        });
    }
};

/**
 * Admin middleware - Check if user is admin
 * @middleware
 * @requires protect middleware to be called first
 */
const admin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            message: 'Not authorized, please login' 
        });
    }

    if (req.user.role === 'admin' || req.user.isAdmin === true) {
        next();
    } else {
        return res.status(403).json({ 
            message: 'Access denied. Admin privileges required.' 
        });
    }
};

/**
 * Optional auth - Attach user if token exists, but don't fail if not
 * @middleware
 */
const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id)
                    .select('-password -__v')
                    .lean()
                    .exec();

                if (user && user.status === 'Active') {
                    req.user = user;
                }
            } catch (error) {
                // Silently fail - user remains undefined
                console.log('[AUTH] Optional auth token invalid:', error.message);
            }
        }

        next();
    } catch (error) {
        console.error('[AUTH] Optional auth error:', error);
        next(); // Continue anyway
    }
};

/**
 * Verified user middleware - Check if user email is verified
 * @middleware
 * @requires protect middleware to be called first
 */
const verified = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            message: 'Not authorized' 
        });
    }

    if (req.user.isVerified) {
        next();
    } else {
        return res.status(403).json({ 
            message: 'Email verification required. Please verify your email.' 
        });
    }
};

/**
 * Rate limit middleware (simple in-memory implementation)
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Time window in milliseconds
 */
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
    const requests = new Map();

    // Clean up old entries every minute
    setInterval(() => {
        const now = Date.now();
        for (const [key, data] of requests.entries()) {
            if (now - data.resetTime > windowMs) {
                requests.delete(key);
            }
        }
    }, 60000);

    return (req, res, next) => {
        // Use user ID if authenticated, otherwise use IP
        const identifier = req.user?._id?.toString() || req.ip;
        const now = Date.now();
        
        const userData = requests.get(identifier) || { 
            count: 0, 
            resetTime: now 
        };

        // Reset if window has passed
        if (now - userData.resetTime > windowMs) {
            userData.count = 0;
            userData.resetTime = now;
        }

        userData.count++;
        requests.set(identifier, userData);

        // Check if limit exceeded
        if (userData.count > maxRequests) {
            return res.status(429).json({ 
                message: 'Too many requests, please try again later',
                retryAfter: Math.ceil((userData.resetTime + windowMs - now) / 1000)
            });
        }

        // Add rate limit headers
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - userData.count));
        res.setHeader('X-RateLimit-Reset', new Date(userData.resetTime + windowMs).toISOString());

        next();
    };
};

module.exports = { 
    protect, 
    admin, 
    optionalAuth, 
    verified,
    rateLimit
};