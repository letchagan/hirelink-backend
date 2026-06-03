const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

// Enforce auth and admin validation globally for these routes
router.use(authMiddleware, roleGuard('admin'));

router.get('/schedule', aiController.generateSchedule);
router.post('/send-ai-email', aiController.sendAiEmail);

module.exports = router;
