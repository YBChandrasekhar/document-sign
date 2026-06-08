const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path} —`, err.message);

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ message: 'File too large. Max size is 10MB' });

  if (err.message === 'Only PDF files are allowed')
    return res.status(400).json({ message: err.message });

  // JWT errors
  if (err.name === 'JsonWebTokenError')
    return res.status(401).json({ message: 'Invalid token' });

  if (err.name === 'TokenExpiredError')
    return res.status(401).json({ message: 'Token expired, please login again' });

  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
