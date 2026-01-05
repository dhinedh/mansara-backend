const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const sharp = require('sharp'); // ADD THIS PACKAGE for image optimization

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB max file size
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
// OPTIMIZED IMAGE UPLOAD WITH COMPRESSION
// ========================================
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log(`[UPLOAD] Processing file: ${req.file.originalname} (${(req.file.size / 1024).toFixed(2)} KB) Type: ${req.file.mimetype}`);

        // ========================================
        // IMAGE OPTIMIZATION WITH SHARP
        // ========================================
        let optimizedBuffer;
        const startTime = Date.now();

        try {
            // Optimize image based on type
            const isWebP = req.file.mimetype === 'image/webp';
            const isPNG = req.file.mimetype === 'image/png';

            if (isWebP) {
                // Optimize WebP
                optimizedBuffer = await sharp(req.file.buffer)
                    .resize(1920, 1920, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .webp({
                        quality: 85,
                        effort: 4 // Balance between speed and compression
                    })
                    .toBuffer();
            } else if (isPNG) {
                // Optimize PNG (convert to WebP for better compression)
                optimizedBuffer = await sharp(req.file.buffer)
                    .resize(1920, 1920, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .webp({
                        quality: 90,
                        lossless: false
                    })
                    .toBuffer();
            } else {
                // Optimize JPEG
                optimizedBuffer = await sharp(req.file.buffer)
                    .resize(1920, 1920, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .jpeg({
                        quality: 85,
                        progressive: true,
                        mozjpeg: true
                    })
                    .toBuffer();
            }

            const optimizationTime = Date.now() - startTime;
            const originalSize = req.file.size;
            const optimizedSize = optimizedBuffer.length;
            const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(2);

            console.log(`[OPTIMIZATION] Time: ${optimizationTime}ms | Original: ${(originalSize / 1024).toFixed(2)} KB | Optimized: ${(optimizedSize / 1024).toFixed(2)} KB | Savings: ${savings}%`);

        } catch (sharpError) {
            console.error('[SHARP ERROR]', sharpError);
            // Fallback to original buffer if optimization fails
            optimizedBuffer = req.file.buffer;
        }

        // ========================================
        // UPLOAD TO CLOUDINARY WITH OPTIMIZATION
        // ========================================
        const uploadPromise = new Promise((resolve, reject) => {
            const isVideo = req.file.mimetype.startsWith('video/');

            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'mansara',
                    resource_type: isVideo ? 'video' : 'image',
                    // Cloudinary transformations for additional optimization
                    transformation: isVideo ? [] : [
                        {
                            quality: 'auto:good', // Auto quality optimization
                            fetch_format: 'auto' // Auto format (WebP for supported browsers)
                        }
                    ],
                    // Generate responsive image variants (only for images)
                    responsive_breakpoints: isVideo ? undefined : {
                        create_derived: true,
                        bytes_step: 20000,
                        min_width: 200,
                        max_width: 1920,
                        max_images: 5
                    }
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

            uploadStream.end(optimizedBuffer);
        });

        const result = await uploadPromise;

        console.log(`[SUCCESS] Uploaded to Cloudinary: ${result.secure_url}`);

        // Return optimized URL with transformations
        res.json({
            url: result.secure_url,
            public_id: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            // Provide optimized URLs for different sizes
            thumbnailUrl: cloudinary.url(result.public_id, {
                transformation: [
                    { width: 200, height: 200, crop: 'fill', quality: 'auto:good' }
                ]
            }),
            mediumUrl: cloudinary.url(result.public_id, {
                transformation: [
                    { width: 600, height: 600, crop: 'limit', quality: 'auto:good' }
                ]
            }),
            responsive_breakpoints: result.responsive_breakpoints
        });

    } catch (error) {
        console.error('[UPLOAD ERROR]', error);
        res.status(500).json({
            message: 'Server error during upload',
            error: error.message
        });
    }
});

// ========================================
// BULK UPLOAD (MULTIPLE IMAGES)
// ========================================
router.post('/bulk', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }

        console.log(`[BULK UPLOAD] Processing ${req.files.length} images`);

        const uploadPromises = req.files.map(async (file) => {
            try {
                // Optimize each image
                const optimizedBuffer = await sharp(file.buffer)
                    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
                    .jpeg({ quality: 85, progressive: true, mozjpeg: true })
                    .toBuffer();

                // Upload to Cloudinary
                return new Promise((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream(
                        {
                            folder: 'mansara',
                            transformation: [
                                { quality: 'auto:good', fetch_format: 'auto' }
                            ]
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve({
                                url: result.secure_url,
                                public_id: result.public_id
                            });
                        }
                    );
                    uploadStream.end(optimizedBuffer);
                });
            } catch (error) {
                console.error(`[ERROR] Failed to process ${file.originalname}:`, error);
                return null;
            }
        });

        const results = await Promise.all(uploadPromises);
        const successfulUploads = results.filter(r => r !== null);

        console.log(`[SUCCESS] Uploaded ${successfulUploads.length}/${req.files.length} images`);

        res.json({
            message: `Successfully uploaded ${successfulUploads.length} images`,
            images: successfulUploads
        });

    } catch (error) {
        console.error('[BULK UPLOAD ERROR]', error);
        res.status(500).json({ message: 'Server error during bulk upload' });
    }
});

// ========================================
// DELETE IMAGE FROM CLOUDINARY
// ========================================
router.delete('/:publicId', async (req, res) => {
    try {
        const publicId = req.params.publicId.replace(/--/g, '/');

        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result === 'ok') {
            res.json({ message: 'Image deleted successfully' });
        } else {
            res.status(404).json({ message: 'Image not found' });
        }
    } catch (error) {
        console.error('[DELETE ERROR]', error);
        res.status(500).json({ message: 'Error deleting image' });
    }
});

module.exports = router;