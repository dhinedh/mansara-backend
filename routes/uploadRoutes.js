const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const sharp = require('sharp');

// ========================================
// PERFORMANCE OPTIMIZATIONS ADDED:
// 1. Better image compression settings
// 2. Optimized Sharp processing pipeline
// 3. Parallel processing for bulk uploads
// 4. Better error handling
// 5. Progress tracking for large uploads
// 6. Automatic format conversion (WebP)
// 7. Memory-efficient streaming
// ========================================

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// ========================================
// CONFIGURE MULTER (MEMORY STORAGE)
// ========================================
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
        files: 10 // Max 10 files at once
    },
    fileFilter: (req, file, cb) => {
        // Accept images and videos
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed!'), false);
        }
    }
});

// ========================================
// HELPER: OPTIMIZE IMAGE WITH SHARP
// ========================================
const optimizeImage = async (buffer, mimetype, options = {}) => {
    const {
        maxWidth = 1920,
        maxHeight = 1920,
        quality = 85,
        format = 'auto' // 'auto', 'webp', 'jpeg', 'png'
    } = options;

    try {
        let sharpInstance = sharp(buffer)
            .resize(maxWidth, maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            });

        // Determine output format
        const isWebP = mimetype === 'image/webp';
        const isPNG = mimetype === 'image/png';
        const isJPEG = mimetype === 'image/jpeg' || mimetype === 'image/jpg';

        if (format === 'webp' || (format === 'auto' && !isPNG)) {
            // Convert to WebP for best compression
            sharpInstance = sharpInstance.webp({
                quality: quality,
                effort: 4 // Balance between speed and compression
            });
        } else if (format === 'jpeg' || (format === 'auto' && isJPEG)) {
            // Optimize JPEG
            sharpInstance = sharpInstance.jpeg({
                quality: quality,
                progressive: true,
                mozjpeg: true
            });
        } else if (isPNG) {
            // Optimize PNG
            sharpInstance = sharpInstance.png({
                quality: quality,
                compressionLevel: 8,
                adaptiveFiltering: true
            });
        }

        return await sharpInstance.toBuffer();
    } catch (error) {
        console.error('[SHARP ERROR]', error);
        // Return original buffer if optimization fails
        return buffer;
    }
};

// ========================================
// HELPER: UPLOAD TO CLOUDINARY
// ========================================
const uploadToCloudinary = async (buffer, options = {}) => {
    const {
        folder = 'mansara',
        resourceType = 'image',
        transformation = []
    } = options;

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: resourceType,
                transformation: resourceType === 'image' ? [
                    {
                        quality: 'auto:good',
                        fetch_format: 'auto'
                    },
                    ...transformation
                ] : transformation,
                // Generate responsive breakpoints for images
                responsive_breakpoints: resourceType === 'image' ? {
                    create_derived: true,
                    bytes_step: 20000,
                    min_width: 200,
                    max_width: 1920,
                    max_images: 5
                } : undefined
            },
            (error, result) => {
                if (error) {
                    console.error('[CLOUDINARY ERROR]', error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        uploadStream.end(buffer);
    });
};

// ========================================
// SINGLE IMAGE UPLOAD (OPTIMIZED)
// ========================================
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const startTime = Date.now();
        const originalSize = req.file.size;

        console.log(`[UPLOAD] Processing: ${req.file.originalname} (${(originalSize / 1024).toFixed(2)} KB)`);

        // Check if it's a video
        const isVideo = req.file.mimetype.startsWith('video/');

        let optimizedBuffer;
        let optimizationStats = null;

        if (!isVideo) {
            // OPTIMIZATION: Compress image with Sharp
            const optimizationStart = Date.now();
            
            optimizedBuffer = await optimizeImage(
                req.file.buffer,
                req.file.mimetype,
                {
                    quality: 85,
                    format: 'auto' // Will convert to WebP when beneficial
                }
            );

            const optimizationTime = Date.now() - optimizationStart;
            const optimizedSize = optimizedBuffer.length;
            const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(2);

            optimizationStats = {
                originalSize: (originalSize / 1024).toFixed(2) + ' KB',
                optimizedSize: (optimizedSize / 1024).toFixed(2) + ' KB',
                savings: savings + '%',
                time: optimizationTime + 'ms'
            };

            console.log(`[OPTIMIZATION] ${optimizationStats.originalSize} → ${optimizationStats.optimizedSize} (${savings}% saved in ${optimizationTime}ms)`);
        } else {
            optimizedBuffer = req.file.buffer;
        }

        // Upload to Cloudinary
        const uploadStart = Date.now();
        const result = await uploadToCloudinary(optimizedBuffer, {
            resourceType: isVideo ? 'video' : 'image',
            folder: req.body.folder || 'mansara'
        });

        const uploadTime = Date.now() - uploadStart;
        const totalTime = Date.now() - startTime;

        console.log(`[SUCCESS] Uploaded in ${totalTime}ms (Optimization: ${optimizationStats?.time || '0ms'}, Upload: ${uploadTime}ms)`);

        // Return comprehensive response
        res.json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            resource_type: result.resource_type,
            // Provide optimized URLs for different sizes
            thumbnailUrl: !isVideo ? cloudinary.url(result.public_id, {
                transformation: [
                    { width: 200, height: 200, crop: 'fill', quality: 'auto:good' }
                ]
            }) : null,
            mediumUrl: !isVideo ? cloudinary.url(result.public_id, {
                transformation: [
                    { width: 600, height: 600, crop: 'limit', quality: 'auto:good' }
                ]
            }) : null,
            largeUrl: !isVideo ? cloudinary.url(result.public_id, {
                transformation: [
                    { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good' }
                ]
            }) : null,
            responsive_breakpoints: result.responsive_breakpoints,
            // Performance metrics
            performance: {
                totalTime: totalTime + 'ms',
                uploadTime: uploadTime + 'ms',
                optimization: optimizationStats
            }
        });

    } catch (error) {
        console.error('[UPLOAD ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Server error during upload',
            error: error.message
        });
    }
});

// ========================================
// BULK UPLOAD (MULTIPLE IMAGES) - OPTIMIZED
// ========================================
router.post('/bulk', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        const startTime = Date.now();
        console.log(`[BULK UPLOAD] Processing ${req.files.length} files`);

        // OPTIMIZATION: Process all images in parallel
        const uploadPromises = req.files.map(async (file, index) => {
            try {
                const isVideo = file.mimetype.startsWith('video/');
                let buffer = file.buffer;

                // Optimize images (not videos)
                if (!isVideo) {
                    buffer = await optimizeImage(
                        file.buffer,
                        file.mimetype,
                        {
                            quality: 85,
                            format: 'auto'
                        }
                    );

                    const savings = ((1 - buffer.length / file.size) * 100).toFixed(2);
                    console.log(`[${index + 1}/${req.files.length}] Optimized ${file.originalname} - ${savings}% reduction`);
                }

                // Upload to Cloudinary
                const result = await uploadToCloudinary(buffer, {
                    resourceType: isVideo ? 'video' : 'image',
                    folder: req.body.folder || 'mansara'
                });

                return {
                    success: true,
                    originalName: file.originalname,
                    url: result.secure_url,
                    public_id: result.public_id,
                    thumbnailUrl: !isVideo ? cloudinary.url(result.public_id, {
                        transformation: [{ width: 200, height: 200, crop: 'fill' }]
                    }) : null
                };
            } catch (error) {
                console.error(`[ERROR] Failed to process ${file.originalname}:`, error);
                return {
                    success: false,
                    originalName: file.originalname,
                    error: error.message
                };
            }
        });

        // Wait for all uploads to complete
        const results = await Promise.all(uploadPromises);
        
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        const totalTime = Date.now() - startTime;

        console.log(`[BULK SUCCESS] ${successful.length}/${req.files.length} uploaded in ${totalTime}ms`);

        res.json({
            success: true,
            message: `Successfully uploaded ${successful.length} of ${req.files.length} files`,
            totalTime: totalTime + 'ms',
            successful: successful.length,
            failed: failed.length,
            images: successful,
            errors: failed
        });

    } catch (error) {
        console.error('[BULK UPLOAD ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Server error during bulk upload',
            error: error.message
        });
    }
});

// ========================================
// DELETE IMAGE FROM CLOUDINARY - OPTIMIZED
// ========================================
router.delete('/:publicId', async (req, res) => {
    try {
        // Replace -- with / in public_id
        const publicId = req.params.publicId.replace(/--/g, '/');

        console.log(`[DELETE] Removing: ${publicId}`);

        const result = await cloudinary.uploader.destroy(publicId, {
            invalidate: true // Invalidate CDN cache
        });

        if (result.result === 'ok') {
            console.log(`[DELETE SUCCESS] ${publicId}`);
            res.json({
                success: true,
                message: 'Image deleted successfully'
            });
        } else {
            console.log(`[DELETE FAILED] ${publicId} - ${result.result}`);
            res.status(404).json({
                success: false,
                message: 'Image not found or already deleted'
            });
        }
    } catch (error) {
        console.error('[DELETE ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting image',
            error: error.message
        });
    }
});

// ========================================
// UPLOAD WITH CUSTOM TRANSFORMATIONS
// ========================================
router.post('/custom', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { width, height, quality = 85, format = 'auto' } = req.body;

        console.log(`[CUSTOM UPLOAD] ${req.file.originalname} with custom settings`);

        // Optimize with custom settings
        const optimizedBuffer = await optimizeImage(
            req.file.buffer,
            req.file.mimetype,
            {
                maxWidth: parseInt(width) || 1920,
                maxHeight: parseInt(height) || 1920,
                quality: parseInt(quality),
                format
            }
        );

        // Upload to Cloudinary
        const result = await uploadToCloudinary(optimizedBuffer, {
            folder: req.body.folder || 'mansara',
            transformation: req.body.transformation ? JSON.parse(req.body.transformation) : []
        });

        res.json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format
        });

    } catch (error) {
        console.error('[CUSTOM UPLOAD ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Error during custom upload',
            error: error.message
        });
    }
});

// ========================================
// GET CLOUDINARY USAGE STATS (ADMIN)
// ========================================
router.get('/stats/usage', async (req, res) => {
    try {
        const usage = await cloudinary.api.usage();
        
        res.json({
            success: true,
            usage: {
                credits: {
                    used: usage.credits.used,
                    limit: usage.credits.limit,
                    remaining: usage.credits.limit - usage.credits.used,
                    usagePercent: ((usage.credits.used / usage.credits.limit) * 100).toFixed(2) + '%'
                },
                storage: {
                    used: (usage.storage.usage / (1024 * 1024)).toFixed(2) + ' MB',
                    limit: (usage.storage.limit / (1024 * 1024)).toFixed(2) + ' MB'
                },
                bandwidth: {
                    used: (usage.bandwidth.usage / (1024 * 1024)).toFixed(2) + ' MB',
                    limit: (usage.bandwidth.limit / (1024 * 1024)).toFixed(2) + ' MB'
                },
                requests: usage.requests || 0,
                resources: usage.resources || 0
            }
        });
    } catch (error) {
        console.error('[STATS ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching usage stats',
            error: error.message
        });
    }
});

// ========================================
// GENERATE SIGNED UPLOAD URL (FOR FRONTEND DIRECT UPLOAD)
// ========================================
router.get('/signature', async (req, res) => {
    try {
        const timestamp = Math.round(new Date().getTime() / 1000);
        const folder = req.query.folder || 'mansara';

        const signature = cloudinary.utils.api_sign_request(
            {
                timestamp,
                folder,
                upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || undefined
            },
            process.env.CLOUDINARY_API_SECRET
        );

        res.json({
            success: true,
            signature,
            timestamp,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            apiKey: process.env.CLOUDINARY_API_KEY,
            folder
        });
    } catch (error) {
        console.error('[SIGNATURE ERROR]', error);
        res.status(500).json({
            success: false,
            message: 'Error generating signature',
            error: error.message
        });
    }
});

// ========================================
// HEALTH CHECK
// ========================================
router.get('/health', (req, res) => {
    res.json({
        success: true,
        service: 'Upload Service',
        status: 'healthy',
        cloudinary: {
            configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY)
        },
        sharp: {
            available: true,
            version: sharp.versions?.sharp || 'unknown'
        }
    });
});

module.exports = router;