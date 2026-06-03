const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

// Public route for Chrome browser direct downloads
router.get('/export', reportController.exportReport);

// Secure for Admins only
router.use(authMiddleware, roleGuard('admin'));

router.get('/availability', reportController.getAvailabilityReport);
router.get('/summary', reportController.getDateSummaryReport);

module.exports = router;
