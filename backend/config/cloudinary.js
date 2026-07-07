const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const streamifier = require('streamifier');

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
        // Collect buffer in memory
        const chunks = [];
        file.stream.on('data', d => chunks.push(d));
        file.stream.on('end', () => {
          const buf = Buffer.concat(chunks);
          const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          const publicId = `tenant-portal/${Date.now()}_${safeName}`;
          const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: 'raw', public_id: publicId, overwrite: true },
            (err, result) => {
              if (err) return cb(err);
              cb(null, {
                path: result.secure_url,
                filename: result.public_id,
                mimetype: 'application/pdf',
                size: buf.length,
              });
            }
          );
          streamifier.createReadStream(buf).pipe(uploadStream);
        });
        file.stream.on('error', cb);
      } else {
        // Delegate images to CloudinaryStorage
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
