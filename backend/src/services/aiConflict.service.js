const { spawn } = require('child_process');
const aiConfig = require('../config/ai');

module.exports = {
  async detectConflicts(totalInterviewers, totalResponses, dates) {
    return new Promise((resolve) => {
      const payload = {
        action: 'conflict',
        data: { total_interviewers: totalInterviewers, total_responses: totalResponses, dates }
      };

      const pyProcess = spawn(aiConfig.pythonPath, [aiConfig.scriptPath]);
      let stdoutData = '';
      let stderrData = '';

      pyProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
      });

      pyProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });

      pyProcess.on('error', (err) => {
        console.warn('AI Python Process failed. Activating native JS fallback...', err.message);
        resolve(this.jsFallback(totalInterviewers, totalResponses, dates));
      });

      pyProcess.on('close', (code) => {
        if (code !== 0) {
          console.warn(`AI Python Process exited with code ${code}. Activating native JS fallback...`);
          return resolve(this.jsFallback(totalInterviewers, totalResponses, dates));
        }
        try {
          const parsed = JSON.parse(stdoutData.trim());
          resolve(parsed);
        } catch (e) {
          console.warn('AI Python Process output parsing failed. Activating native JS fallback...');
          resolve(this.jsFallback(totalInterviewers, totalResponses, dates));
        }
      });

      pyProcess.stdin.write(JSON.stringify(payload));
      pyProcess.stdin.end();
    });
  },

  jsFallback(totalInterviewers, totalResponses, dates) {
    const conflicts = [];
    const responseRate = totalInterviewers > 0 ? (totalResponses / totalInterviewers) : 0;

    if (responseRate < 0.6) {
      conflicts.push({
        type: "Response Rate",
        title: "Low Overall Participation",
        date: "All Dates",
        capacity: totalInterviewers,
        available: totalResponses,
        risk: "High",
        recommendation: "Submit targeted automated reminder emails to all pending interviewers immediately."
      });
    }

    dates.forEach(d => {
      const dStr = d.date;
      const req = d.required_capacity;
      const avail = d.current_avail_count;

      if (avail < req) {
        const deficit = req - avail;
        const risk = avail < req * 0.5 ? "High" : "Medium";
        const recs = [
          "Deploy reminders to pending interviewers.",
          `Reduce target capacity on ${dStr} to ${avail}.`
        ];
        if (deficit > 5) {
          recs.push("Open additional interview dates to distribute scheduling loads.");
        } else {
          recs.push("Add more interviewers to the campaign list.");
        }

        conflicts.push({
          type: "Capacity Shortage",
          title: `Staffing Deficit Detected on ${dStr}`,
          date: dStr,
          capacity: req,
          available: avail,
          risk,
          recommendation: recs.join(" OR ")
        });
      }
    });

    if (conflicts.length === 0) {
      conflicts.push({
        type: "Status Check",
        title: "No Staffing Issues Detected",
        date: "All Dates",
        capacity: 0,
        available: 0,
        risk: "Low",
        recommendation: "Campaign health is optimal. Ready to generate optimized schedules upon deadline completion."
      });
    }

    return {
      success: true,
      conflicts
    };
  }
};
