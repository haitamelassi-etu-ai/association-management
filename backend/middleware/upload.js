const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
// - Local dev: use project folder
// - Vercel serverless: deployment filesystem is read-only; use /tmp
const isVercel = Boolean(process.env.VERCEL);
const uploadsDir = isVercel
  ? path.join('/tmp', 'uploads', 'beneficiaries')
  : path.join(__dirname, '../uploads/beneficiaries');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: beneficiaryId-timestamp-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${req.params.id || 'temp'}-${uniqueSuffix}-${nameWithoutExt}${ext}`);
  }
});

// File filter - only allow certain file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé. Formats acceptés: JPG, PNG, PDF, DOC, DOCX'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: fileFilter
});

// Expose for other routes (download/delete) to stay consistent.
upload.uploadsDir = uploadsDir;

module.exports = upload;
