const db = require('../config/db');
const aiSchedulingService = require('../services/aiScheduling.service');
const nodemailer = require('nodemailer');
const responseHandler = require('../utils/responseHandler');

module.exports = {
  // AI Feature 1: Generate Optimal balanced schedule
  async generateSchedule(req, res) {
    const { campaignId } = req.query;

    try {
      let activeCampaignId = campaignId;
      if (!activeCampaignId) {
        const campaign = await db.get(`SELECT id FROM campaigns ORDER BY id DESC LIMIT 1`);
        if (!campaign) return responseHandler.notFound(res, 'No campaigns found.');
        activeCampaignId = campaign.id;
      }

      // Gather input data
      const interviewers = await db.query(`SELECT id, name, email FROM users WHERE role = 'interviewer'`);
      const dates = await db.query(`SELECT id, date, max_capacity FROM campaign_dates WHERE campaign_id = ?`, [activeCampaignId]);
      const availability = await db.query(`SELECT user_id, campaign_date_id, slot_type FROM availability WHERE campaign_id = ?`, [activeCampaignId]);

      const aiResult = await aiSchedulingService.generateSchedule(interviewers, dates, availability);
      return responseHandler.success(res, aiResult);
    } catch (error) {
      return responseHandler.error(res, error, 'AI Scheduler execution failed.');
    }
  },

  // AI Feature 2: Send reminder email to pending interviewer via Nodemailer
  async sendAiEmail(req, res) {
    const { email, name, deadline, campaignName } = req.body;

    if (!email || !name || !deadline || !campaignName) {
      return responseHandler.badRequest(res, 'Interviewer email, name, deadline, and campaign details are required.');
    }

    try {
      const emailUser = process.env.EMAIL_USER;
      const emailPass = process.env.EMAIL_PASS;

      const subject = `Action Required: Submit Interview Availability - ${campaignName}`;
      const body = `Hello ${name},\n\nThis is a friendly reminder to submit your interview availability for the upcoming campaign "${campaignName}".\n\nCampaign Location/Place: Offline or Online slots available.\nCampaign Submission Deadline: ${deadline}\n\nPlease click the link below to select your slots and complete the form:\nhttp://localhost:5173/\n\nYour prompt response helps our scheduling team plan interviews effectively.\n\nBest Regards,\nHR Team`;

      let emailSentReal = false;
      let logsMessage = '';

      if (emailUser && emailPass) {
        // Construct Nodemailer Transporter using Gmail SMTP config
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: emailUser,
            pass: emailPass
          }
        });

        const mailOptions = {
          from: emailUser,
          to: email,
          subject: subject,
          text: body
        };

        // Send real email
        await transporter.sendMail(mailOptions);
        emailSentReal = true;
        logsMessage = `[SMTP GMAIL SENDER] Email successfully sent to ${email}`;
        console.log(logsMessage);
      } else {
        // Fallback simulated mode
        logsMessage = `[SIMULATED MAIL REMINDER] (Email Env not configured) Sent successfully to console for ${email}`;
        console.log('----------------------------------------------------');
        console.log('✉️  ' + logsMessage);
        console.log(`To: ${email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body:\n${body}`);
        console.log('----------------------------------------------------');
      }

      // Log the reminder email to the database mail_logs
      await db.run(
        `INSERT INTO mail_logs (to_email, from_email, subject, body) VALUES (?, ?, ?, ?)`,
        [email, emailUser || 'hr@hirescheduler.com', subject, body + (emailSentReal ? '\n\n[Status: Dispatched via SMTP]' : '\n\n[Status: Simulated (SMTP Credentials Missing)]')]
      );

      return responseHandler.success(
        res,
        { email, sentReal: emailSentReal, logsMessage },
        emailSentReal ? 'AI reminder email dispatched successfully via Gmail SMTP.' : 'AI reminder email triggered in Simulated Mode successfully (SMTP credentials missing).'
      );
    } catch (error) {
      console.error('Nodemailer SMTP failed:', error);
      return responseHandler.error(res, error, `Failed to dispatch reminder email: ${error.message}`);
    }
  }
};
