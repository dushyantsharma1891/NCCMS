const multer = require('multer');
const path = require('path');
const StoredFile = require('../models/StoredFile');

// Where uploaded images are kept:
//   disk -> backend/uploads/   (default for local development)
//   db   -> MongoDB            (default in production: Render's disk is wiped
//                               on every restart/deploy, MongoDB is not)
// Override with UPLOAD_STORAGE=disk|db.
const mode = process.env.UPLOAD_STORAGE || (process.env.NODE_ENV === 'production' ? 'db' : 'disk');

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  const err = new Error('Only image files (jpeg, jpg, png, webp) are allowed');
  err.isUploadError = true;
  cb(err);
};

const multerInstance = multer({
  storage: mode === 'db' ? multer.memoryStorage() : diskStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// In db mode, after multer has read the files into memory, save each one to
// MongoDB and give it a `filename` — exactly what disk mode provides — so the
// controllers need no changes (they build `/uploads/${file.filename}`).
const persistToDb = async (req, res, next) => {
  try {
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();
    if (req.file) files.push(req.file);
    for (const f of files) {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(f.originalname).toLowerCase()}`;
      await StoredFile.create({ filename: unique, contentType: f.mimetype, size: f.size, data: f.buffer });
      f.filename = unique;
      delete f.buffer; // free the memory
    }
    next();
  } catch (err) {
    next(err);
  }
};

// Same API as multer (`upload.array(...)`, `.single(...)`, `.fields(...)`) so
// routes stay unchanged; each returns a middleware chain.
const wrap = (fn) => (...args) => (mode === 'db' ? [fn.apply(multerInstance, args), persistToDb] : fn.apply(multerInstance, args));

module.exports = {
  array: wrap(multerInstance.array),
  single: wrap(multerInstance.single),
  fields: wrap(multerInstance.fields),
  mode,
};
