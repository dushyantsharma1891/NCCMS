// Centralized error handler
const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

const MULTER_MESSAGES = {
  LIMIT_FILE_SIZE: 'Each image must be 5 MB or smaller',
  LIMIT_FILE_COUNT: 'Too many files were uploaded',
  LIMIT_UNEXPECTED_FILE: 'Too many images — the maximum is 5',
};

const errorHandler = (err, req, res, next) => {
  const isUploadProblem = err.name === 'MulterError' || err.isUploadError;
  let statusCode = err.status || err.statusCode || (isUploadProblem ? 400 : (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500));
  let message = (err.name === 'MulterError' && MULTER_MESSAGES[err.code]) || err.message || 'Server error';
  // Do not leak internals of unexpected failures on a public site.
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    console.error(err);
    message = 'Something went wrong on the server. Please try again.';
  }
  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
