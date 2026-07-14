const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Image storage (jpg, png, gif, webp)
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'tenant-portal',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1200, crop: 'limit' }],
  },
});

// Memory storage for PDFs — we upload them manually via SDK
const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: {
    _handleFile(req, file, cb) {
      if (file.mimetype === 'application/pdf') {
        // Store PDF buffer in memory — will be saved to MongoDB, not Cloudinary
        const chunks = [];
        file.stream.on('data', d => chunks.push(d));
        file.stream.on('end', () => {
          const buf = Buffer.concat(chunks);
          cb(null, {
            buffer: buf,
            mimetype: 'application/pdf',
            size: buf.length,
            originalname: file.originalname,
          });
        });
        file.stream.on('error', cb);
      } else {
        // Images go to Cloudinary as before
        imageStorage._handleFile(req, file, cb);
      }
    },
    _removeFile(req, file, cb) { cb(null); },
  },
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    allowed.includes(file.mimetype) ? cb(null, true) : cb(new Error('Only images and PDFs are allowed'));
  },
});

module.exports = { upload, cloudinary };
