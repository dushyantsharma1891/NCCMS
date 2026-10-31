const mongoose = require('mongoose');

// Uploaded images (complaint photos, resolution proof) when running on a host
// with an ephemeral disk such as Render. Keeping them in MongoDB means they
// survive restarts and redeploys. Served from /uploads/<filename>.
const storedFileSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true, unique: true, index: true },
    contentType: { type: String, required: true },
    size: Number,
    data: { type: Buffer, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('StoredFile', storedFileSchema);
