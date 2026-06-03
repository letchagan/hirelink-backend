const db = require('../config/db');
const exportService = require('../services/export.service');
const responseHandler = require('../utils/responseHandler');

// Helper to compile availability report data in a dialect-agnostic way
async function compileAvailabilityReport(campaignId) {
  const campaign = await db.get(`SELECT * FROM campaigns WHERE id = ?`, [campaignId]);
  if (!campaign) return [];

  // ONLY select interviewers who actually submitted availability for THIS campaign
  const interviewers = await db.query(
    `SELECT DISTINCT u.id, u.name, u.email, u.phone_number FROM users u
     JOIN availability a ON u.id = a.user_id
     WHERE u.role = 'interviewer' AND a.campaign_id = ?
     ORDER BY u.name ASC`,
    [campaignId]
  );

  const selections = await db.query(
    `SELECT a.user_id, cd.date, a.slot_type, cd.location, a.comments FROM availability a 
     JOIN campaign_dates cd ON a.campaign_date_id = cd.id 
     WHERE a.campaign_id = ? ORDER BY cd.date ASC`,
    [campaignId]
  );

  // Group selections by user_id
  const selectionsMap = {};
  selections.forEach(sel => {
    if (!selectionsMap[sel.user_id]) {
      selectionsMap[sel.user_id] = [];
    }
    selectionsMap[sel.user_id].push(sel);
  });

  return interviewers.map(u => {
    const userSel = selectionsMap[u.id] || [];
    
    const slot1 = userSel[0];
    const slot2 = userSel[1];
    const slot3 = userSel[2];

    const formatLoc = (slot) => {
      if (!slot) return '-';
      return slot.slot_type === 'online' ? 'Online' : (slot.location || 'Offline');
    };

    return {
      name: u.name,
      email: u.email,
      phone_number: u.phone_number || '-',
      total_slots: userSel.length,
      slot1: slot1 ? slot1.date : '-',
      slot1_location: formatLoc(slot1),
      slot2: slot2 ? slot2.date : '-',
      slot2_location: formatLoc(slot2),
      slot3: slot3 ? slot3.date : '-',
      slot3_location: formatLoc(slot3),
      comments: (slot1?.comments || slot2?.comments || slot3?.comments || '')
    };
  });
}

// Helper to compile date summary report in a dialect-agnostic way
async function compileSummaryReport(campaignId) {
  const dates = await db.query(
    `SELECT id, date FROM campaign_dates WHERE campaign_id = ? ORDER BY date ASC`,
    [campaignId]
  );

  const selections = await db.query(
    `SELECT a.campaign_date_id, u.name FROM availability a 
     JOIN users u ON a.user_id = u.id 
     WHERE a.campaign_id = ?`,
    [campaignId]
  );

  const selectionsMap = {};
  selections.forEach(sel => {
    if (!selectionsMap[sel.campaign_date_id]) {
      selectionsMap[sel.campaign_date_id] = [];
    }
    selectionsMap[sel.campaign_date_id].push(sel.name);
  });

  return dates.map(d => {
    const list = selectionsMap[d.id] || [];
    return {
      date: d.date,
      count: list.length,
      interviewers: list.join(', ') || 'No selections'
    };
  });
}

module.exports = {
  // Get tabular data of availability selections per interviewer
  async getAvailabilityReport(req, res) {
    const { campaignId } = req.query;

    try {
      let activeCampaignId = campaignId;

      if (!activeCampaignId) {
        const campaign = await db.get(`SELECT id FROM campaigns ORDER BY id DESC LIMIT 1`);
        if (!campaign) {
          return responseHandler.success(res, []);
        }
        activeCampaignId = campaign.id;
      }

      const report = await compileAvailabilityReport(activeCampaignId);
      return responseHandler.success(res, report);
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to build availability report.');
    }
  },

  // Get date summary report of how many interviewers selected each date
  async getDateSummaryReport(req, res) {
    const { campaignId } = req.query;

    try {
      let activeCampaignId = campaignId;

      if (!activeCampaignId) {
        const campaign = await db.get(`SELECT id FROM campaigns ORDER BY id DESC LIMIT 1`);
        if (!campaign) {
          return responseHandler.success(res, []);
        }
        activeCampaignId = campaign.id;
      }

      const report = await compileSummaryReport(activeCampaignId);
      return responseHandler.success(res, report);
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to build date summary report.');
    }
  },

  // Export report to CSV or Excel
  async exportReport(req, res) {
    const { reportType, format, campaignId } = req.query;

    try {
      let activeCampaignId = campaignId;
      if (!activeCampaignId) {
        const campaign = await db.get(`SELECT id FROM campaigns ORDER BY id DESC LIMIT 1`);
        if (!campaign) {
          return responseHandler.badRequest(res, 'No campaigns available to export.');
        }
        activeCampaignId = campaign.id;
      }

      let headers = [];
      let rows = [];
      let filename = '';

      if (reportType === 'availability') {
        filename = 'Interviewer_Availability_Report';
        headers = [
          'Interviewer Name', 
          'email', 
          'phone number', 
          'Total Selected',
          'slot 1', 
          'slot 1 location', 
          'Slot 2', 
          'slot 2 location', 
          'Slot 3', 
          'slot 3 location',
          'Comments'
        ];

        const reportData = await compileAvailabilityReport(activeCampaignId);
        rows = reportData.map(r => [
          r.name,
          r.email,
          r.phone_number,
          r.total_slots,
          r.slot1,
          r.slot1_location,
          r.slot2,
          r.slot2_location,
          r.slot3,
          r.slot3_location,
          r.comments
        ]);
      } else if (reportType === 'summary') {
        filename = 'Date_Summary_Report';
        headers = ['Date', 'Available Interviewers'];

        const reportData = await compileSummaryReport(activeCampaignId);
        rows = reportData.map(r => [
          r.date,
          r.count // Show the count in the cell (or r.count + ' (' + r.interviewers + ')')
        ]);
      } else {
        return responseHandler.badRequest(res, 'Invalid report type requested.');
      }

      if (format === 'csv') {
        const csvContent = exportService.generateCSV(headers, rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        return res.send(csvContent);
      } else if (format === 'excel') {
        const excelContent = exportService.generateExcel(headers, rows);
        res.setHeader('Content-Type', 'application/vnd.ms-excel');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.xls`);
        return res.send(excelContent);
      } else {
        return responseHandler.badRequest(res, 'Invalid export format requested.');
      }
    } catch (error) {
      console.error(error);
      return responseHandler.error(res, error, 'Failed to export reports.');
    }
  }
};
