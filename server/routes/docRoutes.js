const express = require('express');
const protect = require('../middleware/authMiddleware');
const upload = require('../config/multer');
const { uploadDoc, getDocs, getDoc, deleteDoc } = require('../controllers/docController');

const router = express.Router();

router.post('/upload', protect, upload.single('document'), uploadDoc);
router.get('/', protect, getDocs);
router.get('/:id', protect, getDoc);
router.delete('/:id', protect, deleteDoc);

module.exports = router;
