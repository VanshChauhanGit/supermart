const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

router.post('/', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image uploaded' });
  }
  
  console.log('Received file:', req.file);

  try {
    // Upload to cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'supermart/products'
    });
    
    // Delete local file
    fs.unlinkSync(req.file.path);

    res.json({ 
      success: true, 
      imageUrl: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    // Cleanup local file on error - disabled for debugging
    // if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: 'Image upload failed' });
  }
});

router.post('/base64', async (req, res) => {
  const { image } = req.body;
  if (!image) {
    return res.status(400).json({ success: false, message: 'No image provided' });
  }

  try {
    const result = await cloudinary.uploader.upload(image, {
      folder: 'supermart/products'
    });
    
    res.json({ 
      success: true, 
      imageUrl: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Cloudinary base64 upload error:', error);
    res.status(500).json({ success: false, message: 'Image upload failed' });
  }
});

module.exports = router;
