const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const newEnvPath = path.join(__dirname, '../.env'); // Overwrite directly

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    const newLines = [];

    let mongoUri = '';
    let jwtSecret = '';
    let googleClientId = '';
    let razorpayKeyId = '';
    let razorpayKeySecret = '';
    let frontendUrl = '';
    let cloudinaryCloudName = '';
    let cloudinaryApiKey = '';
    let cloudinaryApiSecret = '';
    let cloudinaryUploadPreset = '';
    let brevoApiKey = '';
    let emailUser = '';
    let emailPass = '';
    let emailFrom = '';

    // Extract existing values
    lines.forEach(line => {
        if (line.startsWith('MONGODB_URI=')) mongoUri = line.split('=')[1].trim();
        if (line.startsWith('JWT_SECRET=')) jwtSecret = line.split('=')[1].trim();
        if (line.startsWith('GOOGLE_CLIENT_ID=')) googleClientId = line.split('=')[1].trim();
        if (line.startsWith('RAZORPAY_KEY_ID=')) razorpayKeyId = line.split('=')[1].trim();
        if (line.startsWith('RAZORPAY_KEY_SECRET=')) razorpayKeySecret = line.split('=')[1].trim();
        if (line.startsWith('FRONTEND_URL=')) frontendUrl = line.split('=')[1].trim();
        if (line.startsWith('CLOUDINARY_CLOUD_NAME=')) cloudinaryCloudName = line.split('=')[1].trim();
        if (line.startsWith('CLOUDINARY_API_KEY=')) cloudinaryApiKey = line.split('=')[1].trim();
        if (line.startsWith('CLOUDINARY_API_SECRET=')) cloudinaryApiSecret = line.split('=')[1].trim();
        if (line.startsWith('CLOUDINARY_UPLOAD_PRESET=')) cloudinaryUploadPreset = line.split('=')[1].trim();
        if (line.startsWith('BREVO_API_KEY=')) brevoApiKey = line.split('=')[1].trim();
        if (line.startsWith('EMAIL_USER=')) emailUser = line.split('=')[1].trim();
        if (line.startsWith('EMAIL_PASS=')) emailPass = line.split('=')[1].trim();
        if (line.startsWith('EMAIL_FROM=')) emailFrom = line.split('=')[1].trim();
    });

    // Construct new content
    newLines.push(`PORT=5000`);
    if (mongoUri) newLines.push(`MONGODB_URI=${mongoUri}`);
    if (jwtSecret) newLines.push(`JWT_SECRET=${jwtSecret}`);
    if (googleClientId) newLines.push(`GOOGLE_CLIENT_ID=${googleClientId}`);
    if (razorpayKeyId) newLines.push(`RAZORPAY_KEY_ID=${razorpayKeyId}`);
    if (razorpayKeySecret) newLines.push(`RAZORPAY_KEY_SECRET=${razorpayKeySecret}`);

    // Whapi Token (Fixed)
    newLines.push(`WHAPI_TOKEN=jOjetDO6KxS4pPiD3vyA14FuuaaDn1cR`);

    if (frontendUrl) newLines.push(`FRONTEND_URL=${frontendUrl}`);
    if (cloudinaryCloudName) newLines.push(`CLOUDINARY_CLOUD_NAME=${cloudinaryCloudName}`);
    if (cloudinaryApiKey) newLines.push(`CLOUDINARY_API_KEY=${cloudinaryApiKey}`);
    if (cloudinaryApiSecret) newLines.push(`CLOUDINARY_API_SECRET=${cloudinaryApiSecret}`);
    if (cloudinaryUploadPreset) newLines.push(`CLOUDINARY_UPLOAD_PRESET=${cloudinaryUploadPreset}`);
    if (brevoApiKey) newLines.push(`BREVO_API_KEY=${brevoApiKey}`);
    if (emailUser) newLines.push(`EMAIL_USER=${emailUser}`);
    if (emailPass) newLines.push(`EMAIL_PASS=${emailPass}`);
    if (emailFrom) newLines.push(`EMAIL_FROM=${emailFrom}`);

    // Write back
    fs.writeFileSync(newEnvPath, newLines.join('\n'));
    console.log('✅ .env file fixed and updated!');
    console.log('MONGODB_URI preserved:', mongoUri ? 'YES' : 'NO');

} catch (error) {
    console.error('Error fixing .env:', error);
}
