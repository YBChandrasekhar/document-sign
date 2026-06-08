const express = require('express');
const protect = require('../middleware/authMiddleware');
const { getAuditLogs } = require('../controllers/auditController');

const router = express.Router();

router.get('/:docId', protect, getAuditLogs);

module.exports = router;
