const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const desktopPath = "C:\\Users\\mural\\.gemini\\antigravity\\brain\\a4fedf13-059e-48ec-b131-08722906830a\\mansara_home_banner_desktop_1775706506113.png";
const mobilePath = "C:\\Users\\mural\\.gemini\\antigravity\\brain\\a4fedf13-059e-48ec-b131-08722906830a\\mansara_home_banner_mobile_1775706529458.png";

async function uploadImages() {
  try {
    console.log('Uploading Desktop Banner...');
    const desktopResult = await cloudinary.uploader.upload(desktopPath, {
      folder: 'mansara/banners'
    });
    
    console.log('Uploading Mobile Banner...');
    const mobileResult = await cloudinary.uploader.upload(mobilePath, {
      folder: 'mansara/banners'
    });

    const data = {
        desktop: desktopResult.secure_url,
        mobile: mobileResult.secure_url
    };
    
    fs.writeFileSync('banner_urls.json', JSON.stringify(data, null, 2));
    console.log('URLs saved to banner_urls.json');
    process.exit(0);
  } catch (error) {
    console.error('Upload Failed:', error);
    process.exit(1);
  }
}

uploadImages();
