const express = require('express');
const router = express.Router();
const interviewerController = require('../controllers/interviewer.controller');

// Public availability routes - no auth needed as requested
router.get('/active-campaigns', interviewerController.getActiveCampaigns);
router.get('/active-campaign', interviewerController.getActiveCampaign);
router.post('/submit', interviewerController.submitAvailability);
router.post('/load-existing', interviewerController.loadExisting);
router.post('/schedule', interviewerController.getMySchedule);

module.exports = router;
