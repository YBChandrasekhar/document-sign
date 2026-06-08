const express = require('express');
const protect = require('../middleware/authMiddleware');
const { finalizeDoc, downloadSigned } = require('../controllers/finalizeController');

const router = express.Router();

router.post('/:id/finalize', protect, finalizeDoc);
router.get('/:id/download', protect, downloadSigned);

module.exports = router;
