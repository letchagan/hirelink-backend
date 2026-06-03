const db = require('../config/db');
const responseHandler = require('../utils/responseHandler');
const nodemailer = require('nodemailer');

module.exports = {
  // Retrieve active campaign for the interviewer (Public, no auth)
  async getActiveCampaign(req, res) {
    const { campaignId } = req.query;
    try {
      let campaign;
      if (campaignId) {
        campaign = await db.get(
          `SELECT * FROM campaigns WHERE id = ?`,
          [campaignId]
        );
      } else {
        campaign = await db.get(
          `SELECT * FROM campaigns WHERE status = 'active' ORDER BY id DESC LIMIT 1`
        );
      }

      if (!campaign) {
        return responseHandler.notFound(res, 'No active hiring campaigns at this time.');
      }

      // Fetch campaign dates with remaining capacities
      const dates = await db.query(
        `SELECT cd.id, cd.date, cd.max_capacity, cd.location,
         (SELECT COUNT(*) FROM availability a WHERE a.campaign_date_id = cd.id) as selections
         FROM campaign_dates cd WHERE cd.campaign_id = ?`,
        [campaign.id]
      );

      const mappedDates = dates.map(d => ({
        id: d.id,
        date: d.date,
        maxCapacity: d.max_capacity,
        location: d.location || 'HQ Office',
        selections: d.selections,
        remainingSlots: Math.max(0, d.max_capacity - d.selections)
      }));

      return responseHandler.success(res, {
        ...campaign,
        dates: mappedDates
      });
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to retrieve active campaign.');
    }
  },

  // Load existing selections by email (Public, no auth)
  async loadExisting(req, res) {
    const { email, campaignId } = req.body;

    if (!email) {
      return responseHandler.badRequest(res, 'Email address is required.');
    }

    try {
      // Find user
      const user = await db.get(
        `SELECT * FROM users WHERE email = ? AND role = 'interviewer'`,
        [email.toLowerCase().trim()]
      );

      if (!user) {
        return responseHandler.notFound(res, 'No profile found for this email address.');
      }

      // Find active campaign ID
      let activeCampaignId = campaignId;
      if (!activeCampaignId) {
        const campaign = await db.get(
          `SELECT id FROM campaigns WHERE status = 'active' ORDER BY id DESC LIMIT 1`
        );
        if (!campaign) {
          return responseHandler.success(res, { user, selections: [], comments: '' });
        }
        activeCampaignId = campaign.id;
      }

      // Find availability
      const selections = await db.query(
        `SELECT campaign_date_id, slot_type, comments, created_at FROM availability WHERE user_id = ? AND campaign_id = ? ORDER BY created_at ASC`,
        [user.id, activeCampaignId]
      );

      return responseHandler.success(res, {
        user,
        selections: selections.map(s => ({
          dateId: s.campaign_date_id,
          slotType: s.slot_type
        })),
        comments: selections[0]?.comments || '',
        submitted_at: selections[0]?.created_at || null
      });
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to load existing selections.');
    }
  },

  // Submit availability (No Auth Needed)
  async submitAvailability(req, res) {
    const { name, email, phone_number, campaignId, selectedSlots, comments } = req.body;

    if (!name || !email || !phone_number || !campaignId) {
      return responseHandler.badRequest(res, 'Missing required details (Name, Email, Phone, or Campaign).');
    }

    try {
      // 1. Fetch Campaign details
      const campaign = await db.get(`SELECT * FROM campaigns WHERE id = ?`, [campaignId]);
      if (!campaign) {
        return responseHandler.notFound(res, 'Hiring campaign not found.');
      }

      // Enforce status and deadline
      if (campaign.status === 'closed') {
        return responseHandler.badRequest(res, 'Submission blocked. This availability campaign has been closed.');
      }
      if (new Date(campaign.deadline) < new Date()) {
        return responseHandler.badRequest(res, 'Submission blocked. The deadline for this campaign has passed.');
      }

      // Enforce minimum and maximum selection limits
      const minSlots = campaign.min_selectable_dates || 1;
      if (selectedSlots.length < minSlots) {
        return responseHandler.badRequest(
          res,
          `Submission blocked. You must select at least ${minSlots} date(s).`
        );
      }
      if (selectedSlots.length > campaign.max_selectable_dates) {
        return responseHandler.badRequest(
          res,
          `Submission blocked. You cannot select more than ${campaign.max_selectable_dates} dates.`
        );
      }

      // 2. Find or upsert the user
      let user = await db.get(
        `SELECT * FROM users WHERE email = ? AND role = 'interviewer'`,
        [email.toLowerCase().trim()]
      );

      if (user) {
        // Update name and phone
        await db.run(
          `UPDATE users SET name = ?, phone_number = ? WHERE id = ?`,
          [name.trim(), phone_number.trim(), user.id]
        );
        user.name = name.trim();
        user.phone_number = phone_number.trim();
      } else {
        // Insert new interviewer
        const userInsert = await db.run(
          `INSERT INTO users (email, name, phone_number, role) VALUES (?, ?, ?, 'interviewer')`,
          [email.toLowerCase().trim(), name.trim(), phone_number.trim()]
        );
        user = {
          id: userInsert.insertId,
          email: email.toLowerCase().trim(),
          name: name.trim(),
          phone_number: phone_number.trim()
        };
      }

      // 3. Evaluate capacities for new selections
      const dates = await db.query(
        `SELECT cd.id, cd.date, cd.max_capacity, cd.location,
         (SELECT COUNT(*) FROM availability a WHERE a.campaign_date_id = cd.id AND a.user_id != ?) as external_selections
         FROM campaign_dates cd WHERE cd.campaign_id = ?`,
        [user.id, campaignId]
      );

      const dateMap = new Map(dates.map(d => [d.id, d]));

      for (const slot of selectedSlots) {
        const dObj = dateMap.get(slot.dateId);
        if (!dObj) {
          return responseHandler.badRequest(res, 'Invalid date selection.');
        }

        if (dObj.external_selections >= dObj.max_capacity) {
          return responseHandler.badRequest(
            res,
            `Selection blocked. Date ${dObj.date} has reached full capacity.`
          );
        }
      }

      // 3.5 Remove any previous submission so the new one (with fresh timestamp) replaces it
      await db.run(
        `DELETE FROM availability WHERE user_id = ? AND campaign_id = ?`,
        [user.id, campaignId]
      );

      // 4. Insert new selections with an explicit submitted_at timestamp
      const submittedAt = new Date().toISOString();
      for (const slot of selectedSlots) {
        await db.run(
          `INSERT INTO availability (user_id, campaign_id, campaign_date_id, slot_type, comments, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [user.id, campaignId, slot.dateId, slot.slotType || 'offline', comments || '', submittedAt]
        );
      }

      // 5. Trigger Emails Receipt (Real Nodemailer SMTP if configured, otherwise Simulated Mode)
      const plainTextRows = selectedSlots.map(slot => {
        const dObj = dateMap.get(Number(slot.dateId));
        const dateStr = dObj ? dObj.date : 'Unknown Date';
        const loc = slot.slotType === 'online' ? 'Online (Virtual)' : (dObj ? (dObj.location || 'HQ Office') : 'HQ Office');
        const mode = slot.slotType === 'online' ? 'Online' : 'Offline';
        return `- Date: ${dateStr} | Mode: ${mode} | Location: ${loc}`;
      }).join('\n');

      const htmlTableRows = selectedSlots.map(slot => {
        const dObj = dateMap.get(Number(slot.dateId));
        const dateStr = dObj ? dObj.date : 'Unknown Date';
        const loc = slot.slotType === 'online' ? 'Online (Virtual)' : (dObj ? (dObj.location || 'HQ Office') : 'HQ Office');
        const mode = slot.slotType === 'online' ? 'Online' : 'Offline';
        return `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${dateStr}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${mode}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${loc}</td>
          </tr>`;
      }).join('');

      const selectedDatesText = plainTextRows;

      const htmlMailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
          <h2 style="color: #2b6cb0;">Hello ${user.name},</h2>
          <p>We have successfully received your interviewer availability for <strong>"${campaign.name}"</strong>.</p>
          <h3 style="border-bottom: 1px solid #e0e0e0; padding-bottom: 5px;">Selected Availability Slots:</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f7fafc; text-align: left;">
                <th style="padding: 8px; border: 1px solid #ddd;">Date</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Mode</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Location</th>
              </tr>
            </thead>
            <tbody>${htmlTableRows}</tbody>
          </table>
          <p><strong>Additional Comments:</strong> <br/> ${comments || '<em>None</em>'}</p>
          <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
          <p style="color: #718096; font-size: 14px;">Thank you for your response!<br/>Best Regards,<br/><strong>HR Recruiting Team</strong></p>
        </div>`;

      const hrHtmlMailBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px;">
          <h2>[HR COPY] Availability Submitted</h2>
          <p>Dear Letchagan / HR Team,</p>
          <p>An interviewer has submitted their availability details.</p>
          <h3>Interviewer Details:</h3>
          <ul>
            <li><strong>Name:</strong> ${user.name}</li>
            <li><strong>Email:</strong> ${user.email}</li>
            <li><strong>Phone:</strong> ${user.phone_number}</li>
          </ul>
          <h3>Selected Availability Slots:</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f7fafc; text-align: left;">
                <th style="padding: 8px; border: 1px solid #ddd;">Date</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Mode</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Location</th>
              </tr>
            </thead>
            <tbody>${htmlTableRows}</tbody>
          </table>
          <p><strong>Additional Comments:</strong> <br/> ${comments || '<em>None</em>'}</p>
          <p>Best Regards,<br/>HireLink Scheduling System</p>
        </div>`;

      const mailBody = `Hello ${user.name},\n\nWe have successfully received your interviewer availability for "${campaign.name}".\n\nSelected Slots:\n${selectedDatesText}\n\nAdditional Comments: ${comments || 'None'}\n\nThank you for your response!\n\nBest Regards,\nHR Recruiting Team`;

      // Mail sending has been disabled.

      return responseHandler.success(res, selectedSlots, 'Availability submitted successfully.');
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to save availability choices.');
    }
  },

  // Retrieve all active campaigns for the interviewer dropdown
  async getActiveCampaigns(req, res) {
    try {
      const campaigns = await db.query(
        `SELECT id, name FROM campaigns WHERE status = 'active' ORDER BY id DESC`
      );
      return responseHandler.success(res, campaigns);
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to fetch active campaigns.');
    }
  },

  // Get all submitted schedule dates for an interviewer
  async getMySchedule(req, res) {
    const { email } = req.body;
    if (!email) {
      return responseHandler.badRequest(res, 'Email address is required.');
    }
    try {
      const user = await db.get(
        `SELECT id FROM users WHERE email = ? AND role = 'interviewer'`,
        [email.toLowerCase().trim()]
      );
      if (!user) {
        return responseHandler.success(res, []);
      }
      const schedule = await db.query(
        `SELECT c.name as campaignName, cd.date, cd.location as defaultLocation, a.slot_type as mode 
         FROM availability a 
         JOIN campaigns c ON a.campaign_id = c.id
         JOIN campaign_dates cd ON a.campaign_date_id = cd.id
         WHERE a.user_id = ?
         ORDER BY cd.date ASC`,
        [user.id]
      );
      return responseHandler.success(res, schedule);
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to fetch schedule.');
    }
  }
};
