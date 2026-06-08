require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorMiddleware');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/signed', express.static('signed'));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/', (req, res) => res.json({
  message: 'DocSign API running',
  status: 'ok',
  timestamp: new Date().toISOString(),
}));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/docs', require('./routes/docRoutes'));
app.use('/api/signatures', require('./routes/signatureRoutes'));
app.use('/api/docs', require('./routes/finalizeRoutes'));

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
