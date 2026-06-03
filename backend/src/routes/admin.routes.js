const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const authMiddleware = require('../middleware/auth');
const roleGuard = require('../middleware/roleGuard');

// Enforce HR Admin authentication globally for these paths
router.use(authMiddleware, roleGuard('admin'));

// Interviewer Profiles CRUD
router.get('/interviewers', adminController.getInterviewers);
router.post('/interviewers', adminController.createInterviewer);
router.delete('/interviewers/:id', adminController.deleteInterviewer);

// Campaigns management CRUD
router.post('/campaigns', adminController.createCampaign);
router.get('/campaigns', adminController.getCampaigns);
router.get('/campaigns/:id', adminController.getCampaignById);
router.put('/campaigns/:id', adminController.updateCampaign);
router.put('/campaigns/:id/status', adminController.toggleCampaignStatus);
router.delete('/campaigns/:id', adminController.deleteCampaign);

// Stats & charts visual distributions
router.get('/stats', adminController.getDashboardStats);
router.get('/charts', adminController.getDashboardCharts);

// Email notification audits
router.get('/mail-logs', adminController.getMailLogs);

module.exports = router;
