// Integration Test Script for HireScheduler full-stack platform
// Validates: Database setup, Seeding records, OTP flows, AI Python Engine scheduling, conflicts, reports, and exports.

require('dotenv').config();
const db = require('./src/config/db');
const otpService = require('./src/services/otp.service');
const aiSchedulingService = require('./src/services/aiScheduling.service');
const aiConflictService = require('./src/services/aiConflict.service');
const aiReportService = require('./src/services/aiReport.service');
const exportService = require('./src/services/export.service');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 HIRESCHEDULER INTEGRATION & AI ENGINE TESTING');
  console.log('====================================================\n');

  try {
    // 1. Initialize DB and seed
    console.log('STEP 1: Initializing Database & Seed Tables...');
    await db.connectAndBootstrap();
    console.log('✓ Database booted and seeded.\n');

    // 2. Verify seeded accounts
    console.log('STEP 2: Verifying seeded accounts...');
    const users = await db.query('SELECT * FROM users');
    console.log(`✓ Retreived ${users.length} seeded users:`);
    users.forEach(u => console.log(`  - [${u.role.toUpperCase()}] Name: ${u.name}, Email: ${u.email}, ID: ${u.employee_id || 'N/A'}`));
    console.log('');

    // 3. Test OTP code generation and verification
    console.log('STEP 3: Testing OTP flows...');
    const targetEmail = 'john@hirescheduler.com';
    const targetEmpId = 'EMP001';
    
    console.log(`  - Dispatched OTP to ${targetEmail}...`);
    const otp = await otpService.sendOTP(targetEmail, targetEmpId);
    console.log(`  - Dispatched Code: ${otp}`);
    
    console.log('  - Verifying the passcode...');
    const verifiedEmail = await otpService.verifyOTP(targetEmail, targetEmpId, otp);
    console.log(`  - Result verified email matches: ${verifiedEmail}`);
    if (verifiedEmail === targetEmail) {
      console.log('✓ OTP security verification checks passed.\n');
    } else {
      throw new Error('OTP verification email mismatch!');
    }

    // 4. Register a test campaign
    console.log('STEP 4: Registering a test availability campaign...');
    const campaignResult = await db.run(
      `INSERT INTO campaigns (name, start_date, end_date, deadline, max_selectable_dates, status) VALUES (?, ?, ?, ?, ?, 'active')`,
      ['July Hiring Drive 2026', '2026-07-10', '2026-07-13', '2026-07-09 23:59:59', 3]
    );
    const campaignId = campaignResult.insertId;
    console.log(`  - Registered Campaign ID: ${campaignId}`);

    const campaignDates = [
      { date: '2026-07-10', max_capacity: 2 }, // low capacity to test overbooking
      { date: '2026-07-11', max_capacity: 3 },
      { date: '2026-07-12', max_capacity: 3 },
      { date: '2026-07-13', max_capacity: 3 }
    ];

    const dateIds = [];
    for (const cd of campaignDates) {
      const cdResult = await db.run(
        `INSERT INTO campaign_dates (campaign_id, date, max_capacity) VALUES (?, ?, ?)`,
        [campaignId, cd.date, cd.max_capacity]
      );
      dateIds.push({ id: cdResult.insertId, date: cd.date, max_capacity: cd.max_capacity });
    }
    console.log('✓ Campaign and specific date slots configured.\n');

    // 5. Populate mock interviewer availability selections
    console.log('STEP 5: Populating interviewer availability preferences...');
    
    // John (id 2), David (id 3), Alex (id 4), Kumar (id 5), Peter (id 6), Ram (id 7)
    const mockSelections = [
      { user_id: 2, campaign_date_id: dateIds[0].id }, // 10 July
      { user_id: 2, campaign_date_id: dateIds[1].id }, // 11 July
      
      { user_id: 3, campaign_date_id: dateIds[0].id }, // 10 July
      { user_id: 3, campaign_date_id: dateIds[1].id }, // 11 July
      { user_id: 3, campaign_date_id: dateIds[2].id }, // 12 July

      { user_id: 4, campaign_date_id: dateIds[0].id }, // 10 July (Exceeds capacity of 2 on 10 July!)
      { user_id: 4, campaign_date_id: dateIds[2].id }, // 12 July
      
      { user_id: 5, campaign_date_id: dateIds[1].id }, // 11 July
      { user_id: 5, campaign_date_id: dateIds[2].id }  // 12 July
    ];

    for (const sel of mockSelections) {
      await db.run(
        `INSERT INTO availability (user_id, campaign_id, campaign_date_id) VALUES (?, ?, ?)`,
        [sel.user_id, campaignId, sel.campaign_date_id]
      );
    }
    console.log('✓ Availabilities successfully saved.\n');

    // 6. Test AI Scheduling Assistant (Invoking Python AI script)
    console.log('STEP 6: Launching Python AI Workload Scheduler...');
    const interviewers = await db.query('SELECT id, name, email FROM users WHERE role = \'interviewer\'');
    const datesInput = await db.query('SELECT id, date, max_capacity FROM campaign_dates WHERE campaign_id = ?', [campaignId]);
    const availInput = await db.query('SELECT user_id, campaign_date_id FROM availability WHERE campaign_id = ?', [campaignId]);

    const schedulingPlan = await aiSchedulingService.generateSchedule(interviewers, datesInput, availInput);
    console.log('✓ Python AI Optimizer completed successfully.');
    console.log('  - Schedule Plan Score:', schedulingPlan.score);
    console.log('  - Balanced Workload Rating:', schedulingPlan.balanced_workload);
    console.log('  - Recommended Schedules Output:');
    Object.entries(schedulingPlan.schedule).forEach(([dt, staff]) => {
      console.log(`    * Date ${dt} -> Staff: [${staff.join(', ')}]`);
    });
    console.log('  - AI Optimization Log:\n' + schedulingPlan.explanation + '\n');

    // 7. Test AI Conflict Detection Engine
    console.log('STEP 7: Launching Python AI Staffing Conflict Warning Engine...');
    const totalIntvs = interviewers.length;
    const totalResponses = 4; // Responded count (John, David, Alex, Kumar)
    
    // Count selections per date to feed conflicts check
    const datesCounts = [];
    for (const cd of dateIds) {
      const selections = mockSelections.filter(s => s.campaign_date_id === cd.id).length;
      datesCounts.push({
        date: cd.date,
        required_capacity: cd.max_capacity,
        current_avail_count: selections
      });
    }

    const conflictAnalysis = await aiConflictService.detectConflicts(totalIntvs, totalResponses, datesCounts);
    console.log('✓ Python AI Conflict Analyzer completed successfully.');
    console.log('  - Identified Risks Count:', conflictAnalysis.conflicts.length);
    conflictAnalysis.conflicts.forEach(c => {
      console.log(`    * [RISK: ${c.risk.toUpperCase()}] ${c.title} (Date: ${c.date})`);
      console.log(`      Recommendation: ${c.recommendation}`);
    });
    console.log('');

    // 8. Test AI Executive Summary Report
    console.log('STEP 8: Launching Python AI Executive Reporter...');
    const execReport = await aiReportService.generateReport(totalIntvs, totalResponses, datesCounts.map(d => ({ date: d.date, selections: d.current_avail_count })));
    console.log('✓ Python AI Executive Report completed successfully.');
    console.log('  - Most Selected:', execReport.most_selected);
    console.log('  - Least Selected:', execReport.least_selected);
    console.log('  - Management Recommendations:\n    ' + execReport.recommendation + '\n');

    // 9. Test Reporting Exporters
    console.log('STEP 9: Verifying CSV & Excel XML document generation...');
    const headers = ['Name', 'Employee ID', 'Date 1', 'Date 2'];
    const rows = [
      ['John Doe', 'EMP001', '2026-07-10', '2026-07-11'],
      ['David Smith', 'EMP002', '2026-07-10', '2026-07-11']
    ];

    const csvOut = exportService.generateCSV(headers, rows);
    const excelOut = exportService.generateExcel(headers, rows);
    
    console.log('✓ CSV Formatted String preview (first 80 chars):', csvOut.substring(0, 80).replace(/\n/g, '\\n') + '...');
    console.log('✓ XML Excel Document generated successfully.');
    console.log('  - Excel content length:', excelOut.length, 'bytes\n');

    console.log('====================================================');
    console.log('🎉 INTEGRATION AND AI BRIDGES EXECUTED SUCCESSFULLY!');
    console.log('====================================================');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED WITH AN ERROR:');
    console.error(error);
    process.exit(1);
  }
}

runTests();
