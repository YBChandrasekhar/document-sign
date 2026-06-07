const express = require('express');
const protect = require('../middleware/authMiddleware');
const {
  createSignature,
  getSignatures,
  updateSignature,
  deleteSignature,
} = require('../controllers/signatureController');

const router = express.Router();

router.post('/', protect, createSignature);
router.get('/:id', protect, getSignatures);
router.put('/:id', protect, updateSignature);
router.delete('/:id', protect, deleteSignature);

module.exports = router;
