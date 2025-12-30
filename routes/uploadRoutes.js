const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer (memory storage)
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Upload to Cloudinary stream
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'mansara' },
            (error, result) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ message: 'Upload to Cloudinary failed' });
                }
                res.json({
                    url: result.secure_url,
                    public_id: result.public_id
                });
            }
        );

        uploadStream.end(req.file.buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during upload' });
    }
});

module.exports = router;
