const db = require('../config/db');
const responseHandler = require('../utils/responseHandler');

module.exports = {
  // Retrieve all interviewer profiles
  async getInterviewers(req, res) {
    const { campaignId } = req.query;
    try {
      let query = `SELECT id, name, phone_number FROM users WHERE role = 'interviewer'`;
      let params = [];

      if (campaignId && campaignId !== 'all') {
        query = `SELECT u.id, u.name, u.phone_number FROM users u
                 JOIN campaign_interviewers ci ON u.id = ci.user_id
                 WHERE u.role = 'interviewer' AND ci.campaign_id = ?`;
      }
      query += ` ORDER BY id DESC`;

      const interviewers = await db.query(query, params);
      return responseHandler.success(res, interviewers);
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to fetch interviewers.');
    }
  },

  // Create new interviewer profile
  async createInterviewer(req, res) {
    let { email, name, phone_number, campaignId } = req.body;

    if (!name || !phone_number) {
      return responseHandler.badRequest(res, 'Name and phone number are required.');
    }
    
    // Inject placeholder email if not provided
    if (!email) {
      email = `${phone_number.trim()}@placeholder.com`;
    }

    try {
      // Check existing email
      let user = await db.get(
        `SELECT * FROM users WHERE email = ?`,
        [email.toLowerCase().trim()]
      );

      let userId;

      if (user) {
        if (user.role !== 'interviewer') {
          return responseHandler.badRequest(res, 'This email is already in use by an admin.');
        }
        userId = user.id;
      } else {
        const result = await db.run(
          `INSERT INTO users (email, name, phone_number, role) VALUES (?, ?, ?, 'interviewer')`,
          [email.toLowerCase().trim(), name.trim(), phone_number.trim()]
        );
        userId = result.insertId;
      }

      if (campaignId && campaignId !== 'all') {
        const existingLink = await db.get(
          `SELECT * FROM campaign_interviewers WHERE campaign_id = ? AND user_id = ?`,
          [campaignId, userId]
        );
        if (!existingLink) {
          await db.run(
            `INSERT INTO campaign_interviewers (campaign_id, user_id) VALUES (?, ?)`,
            [campaignId, userId]
          );
        } else if (user) {
          return responseHandler.badRequest(res, 'This interviewer is already registered for this campaign.');
        }
      }

      return responseHandler.success(
        res,
        { id: userId, email, name, phone_number },
        'Interviewer profile processed successfully.',
        201
      );
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to create interviewer.');
    }
  },

  // Delete interviewer profile
  async deleteInterviewer(req, res) {
    const { id } = req.params;
    try {
      const user = await db.get(`SELECT * FROM users WHERE id = ? AND role = 'interviewer'`, [id]);
      if (!user) {
        return responseHandler.notFound(res, 'Interviewer not found.');
      }

      await db.run(`DELETE FROM users WHERE id = ?`, [id]);
      return responseHandler.success(res, null, 'Interviewer profile deleted successfully.');
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to delete interviewer.');
    }
  },

  // Create a hiring availability campaign with overlap checks
  async createCampaign(req, res) {
    const { name, start_date, end_date, deadline, max_selectable_dates, min_selectable_dates, location, dates, force } = req.body;

    if (!name || !start_date || !end_date || !deadline || !dates || !dates.length) {
      return responseHandler.badRequest(res, 'Missing required campaign details or date allocations.');
    }

    try {
      // Real-time overlap date checking against other active campaigns
      const overlaps = [];
      for (const d of dates) {
        const overlapping = await db.get(
          `SELECT c.name, cd.date FROM campaign_dates cd 
           JOIN campaigns c ON cd.campaign_id = c.id 
           WHERE cd.date = ? AND c.status = 'active'`,
          [d.date]
        );
        if (overlapping) {
          overlaps.push(`Date ${d.date} overlaps with active campaign "${overlapping.name}"`);
        }
      }

      if (overlaps.length > 0 && !force) {
        // Return overlaps without creating the campaign
        return responseHandler.success(
          res,
          { overlaps, needsAcknowledge: true },
          'Overlaps detected. Acknowledgement required.',
          200
        );
      }

      // Insert campaign
      const campaignResult = await db.run(
        `INSERT INTO campaigns (name, start_date, end_date, deadline, max_selectable_dates, min_selectable_dates, location, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
        [name, start_date, end_date, deadline, max_selectable_dates || 3, min_selectable_dates || 1, location || '']
      );

      const campaignId = campaignResult.insertId;

      // Insert dates with capacities
      for (const d of dates) {
        await db.run(
          `INSERT INTO campaign_dates (campaign_id, date, max_capacity, location) VALUES (?, ?, ?, ?)`,
          [campaignId, d.date, d.max_capacity || 20, d.location || '']
        );
      }

      return responseHandler.success(
        res,
        { campaignId, name, start_date, end_date, deadline, location, overlaps },
        'Hiring campaign created successfully.',
        201
      );
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to create campaign.');
    }
  },

  // Update campaign details
  async updateCampaign(req, res) {
    const { id } = req.params;
    const { name, start_date, end_date, deadline, max_selectable_dates, min_selectable_dates, location, dates } = req.body;

    if (!name || !start_date || !end_date || !deadline || !dates || !dates.length) {
      return responseHandler.badRequest(res, 'Missing required campaign details or date allocations.');
    }

    try {
      const campaign = await db.get(`SELECT * FROM campaigns WHERE id = ?`, [id]);
      if (!campaign) {
        return responseHandler.notFound(res, 'Campaign not found.');
      }

      // Real-time overlap date checking against other active campaigns (excluding this one)
      const overlaps = [];
      for (const d of dates) {
        const overlapping = await db.get(
          `SELECT c.name, cd.date FROM campaign_dates cd 
           JOIN campaigns c ON cd.campaign_id = c.id 
           WHERE cd.date = ? AND c.status = 'active' AND c.id != ?`,
          [d.date, id]
        );
        if (overlapping) {
          overlaps.push(`Date ${d.date} overlaps with active campaign "${overlapping.name}"`);
        }
      }

      // Update campaign core fields
      await db.run(
        `UPDATE campaigns SET name = ?, start_date = ?, end_date = ?, deadline = ?, max_selectable_dates = ?, min_selectable_dates = ?, location = ? WHERE id = ?`,
        [name, start_date, end_date, deadline, max_selectable_dates || 3, min_selectable_dates || 1, location || '', id]
      );

      // Fetch existing campaign dates
      const existingDates = await db.query(
        `SELECT id, date FROM campaign_dates WHERE campaign_id = ?`,
        [id]
      );
      const existingDateMap = new Map(existingDates.map(ed => [ed.date, ed.id]));
      const newDateSet = new Set(dates.map(d => d.date));

      // Remove deleted dates
      for (const ed of existingDates) {
        if (!newDateSet.has(ed.date)) {
          await db.run(`DELETE FROM campaign_dates WHERE id = ?`, [ed.id]);
        }
      }

      // Sync updated/inserted dates
      for (const d of dates) {
        if (existingDateMap.has(d.date)) {
          const dateId = existingDateMap.get(d.date);
          await db.run(
            `UPDATE campaign_dates SET max_capacity = ?, location = ? WHERE id = ?`,
            [d.max_capacity, d.location || '', dateId]
          );
        } else {
          await db.run(
            `INSERT INTO campaign_dates (campaign_id, date, max_capacity, location) VALUES (?, ?, ?, ?)`,
            [id, d.date, d.max_capacity, d.location || '']
          );
        }
      }

      return responseHandler.success(
        res,
        { campaignId: id, name, start_date, end_date, deadline, location, overlaps },
        'Hiring campaign updated successfully.'
      );
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to update campaign details.');
    }
  },

  // Toggle/Update Campaign status (e.g. active vs closed)
  async toggleCampaignStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'closed'].includes(status)) {
      return responseHandler.badRequest(res, 'Status must be either "active" or "closed".');
    }

    try {
      const campaign = await db.get(`SELECT * FROM campaigns WHERE id = ?`, [id]);
      if (!campaign) {
        return responseHandler.notFound(res, 'Campaign not found.');
      }

      await db.run(`UPDATE campaigns SET status = ? WHERE id = ?`, [status, id]);
      return responseHandler.success(res, { id, status }, `Campaign availability collection has been ${status === 'active' ? 'opened' : 'closed'} successfully.`);
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to toggle campaign status.');
    }
  },

  // Fetch all availability campaigns
  async getCampaigns(req, res) {
    try {
      const campaigns = await db.query(`SELECT * FROM campaigns ORDER BY id DESC`);
      return responseHandler.success(res, campaigns);
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to fetch campaigns.');
    }
  },

  // Fetch campaign by details
  async getCampaignById(req, res) {
    const { id } = req.params;
    try {
      const campaign = await db.get(`SELECT * FROM campaigns WHERE id = ?`, [id]);
      if (!campaign) {
        return responseHandler.notFound(res, 'Campaign not found.');
      }

      const dates = await db.query(
        `SELECT cd.id, cd.date, cd.max_capacity, cd.location, 
         (SELECT COUNT(*) FROM availability a WHERE a.campaign_date_id = cd.id) as current_selections
         FROM campaign_dates cd WHERE cd.campaign_id = ?`,
        [id]
      );

      return responseHandler.success(res, { ...campaign, dates });
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to fetch campaign details.');
    }
  },

  // Delete campaign
  async deleteCampaign(req, res) {
    const { id } = req.params;
    try {
      const campaign = await db.get(`SELECT * FROM campaigns WHERE id = ?`, [id]);
      if (!campaign) {
        return responseHandler.notFound(res, 'Campaign not found.');
      }

      await db.run(`DELETE FROM campaigns WHERE id = ?`, [id]);
      return responseHandler.success(res, null, 'Campaign deleted successfully.');
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to delete campaign.');
    }
  },

  // Gather dashboard KPI metrics
  async getDashboardStats(req, res) {
    const { campaignId } = req.query;
    try {
      let campaign;
      if (campaignId) {
        campaign = await db.get(`SELECT * FROM campaigns WHERE id = ?`, [campaignId]);
      } else {
        campaign = await db.get(`SELECT * FROM campaigns ORDER BY id DESC LIMIT 1`);
      }
      
      let totalInterviewers = 0;
      if (campaign) {
        const totalIntvsRow = await db.get(
          `SELECT COUNT(*) as cnt FROM campaign_interviewers WHERE campaign_id = ?`,
          [campaign.id]
        );
        totalInterviewers = totalIntvsRow.cnt;
      } else {
        const globalRow = await db.get(`SELECT COUNT(*) as cnt FROM users WHERE role = 'interviewer'`);
        totalInterviewers = globalRow.cnt;
      }

      if (!campaign) {
        return responseHandler.success(res, {
          totalInterviewers,
          totalResponses: 0,
          pendingResponses: totalInterviewers,
          responsePercentage: 0,
          campaignName: 'No Active Campaign'
        });
      }

      // Total interviewers who submitted availability for this campaign
      const respondedRow = await db.get(
        `SELECT COUNT(DISTINCT user_id) as cnt FROM availability WHERE campaign_id = ?`,
        [campaign.id]
      );
      const totalResponses = respondedRow.cnt;
      const pendingResponses = Math.max(0, totalInterviewers - totalResponses);

      // Ensure totalInterviewers is at least as large as totalResponses to prevent UI anomalies 
      // where responses exist but the mapping table wasn't populated (e.g. legacy data).
      totalInterviewers = Math.max(totalInterviewers, totalResponses);

      const responsePercentage = totalInterviewers > 0 
        ? Math.round((totalResponses / totalInterviewers) * 100) 
        : 0;

      return responseHandler.success(res, {
        campaignId: campaign.id,
        campaignName: campaign.name,
        campaignLocation: campaign.location,
        campaignStatus: campaign.status,
        totalInterviewers,
        totalResponses,
        pendingResponses,
        responsePercentage
      });
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to retrieve dashboard KPI metrics.');
    }
  },

  // Fetch charts visual data distributions
  async getDashboardCharts(req, res) {
    const { campaignId } = req.query;

    try {
      let activeCampaignId = campaignId;

      if (!activeCampaignId) {
        const campaign = await db.get(`SELECT id FROM campaigns ORDER BY id DESC LIMIT 1`);
        if (!campaign) {
          return responseHandler.success(res, { responseOverview: [], dateDistribution: [] });
        }
        activeCampaignId = campaign.id;
      }

      const totalIntvsRow = await db.get(`SELECT COUNT(*) as cnt FROM users WHERE role = 'interviewer'`);
      const totalCount = totalIntvsRow.cnt;

      const respondedRow = await db.get(
        `SELECT COUNT(DISTINCT user_id) as cnt FROM availability WHERE campaign_id = ?`,
        [activeCampaignId]
      );
      const respondedCount = respondedRow.cnt;
      const pendingCount = Math.max(0, totalCount - respondedCount);

      // 1. Response Status Overview Chart
      const responseOverview = [
        { status: 'Responded', count: respondedCount },
        { status: 'Pending', count: pendingCount }
      ];

      // 2. Date Selection Capacity Distribution
      const dateSelections = await db.query(
        `SELECT cd.date, cd.max_capacity,
         (SELECT COUNT(*) FROM availability a WHERE a.campaign_date_id = cd.id) as selections
         FROM campaign_dates cd WHERE cd.campaign_id = ?`,
        [activeCampaignId]
      );

      const dateDistribution = dateSelections.map(d => ({
        date: d.date,
        selections: d.selections,
        capacity: d.max_capacity
      }));

      return responseHandler.success(res, {
        responseOverview,
        dateDistribution
      });
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to fetch visual chart data.');
    }
  },

  // Query mail logs history
  async getMailLogs(req, res) {
    try {
      const logs = await db.query(`SELECT * FROM mail_logs ORDER BY id DESC`);
      return responseHandler.success(res, logs);
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to retrieve email notification audit logs.');
    }
  }
};
