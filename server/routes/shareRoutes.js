const express = require('express');
const protect = require('../middleware/authMiddleware');
const { generateSignLink, getDocByToken, signByToken } = require('../controllers/shareController');

const router = express.Router();

router.post('/generate', protect, generateSignLink);
router.get('/token/:token', getDocByToken);
router.post('/token/:token/sign', signByToken);

module.exports = router;
