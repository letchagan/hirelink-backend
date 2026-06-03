const { spawn } = require('child_process');
const aiConfig = require('../config/ai');

module.exports = {
  async generateInsights(totalInterviewers, totalResponses, dates) {
    return new Promise((resolve) => {
      const payload = {
        action: 'report',
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
          resolve(this.formatInsights(parsed));
        } catch (e) {
          console.warn('AI Python Process output parsing failed. Activating native JS fallback...');
          resolve(this.jsFallback(totalInterviewers, totalResponses, dates));
        }
      });

      pyProcess.stdin.write(JSON.stringify(payload));
      pyProcess.stdin.end();
    });
  },

  formatInsights(parsed) {
    return {
      success: true,
      insights: [
        {
          category: 'Staffing Distribution',
          insight: `The highest selection rate occurred on ${parsed.most_selected}. The lowest occurred on ${parsed.least_selected}.`,
          severity: 'neutral'
        },
        {
          category: 'Capacity Recommendation',
          insight: parsed.recommendation || 'Operational parameters are within bounds.',
          severity: 'success'
        }
      ]
    };
  },

  jsFallback(totalInterviewers, totalResponses, dates) {
    let mostSelectedDate = "None";
    let leastSelectedDate = "None";

    if (dates && dates.length > 0) {
      const sorted = [...dates].sort((a, b) => a.selections - b.selections);
      leastSelectedDate = sorted[0].date;
      mostSelectedDate = sorted[sorted.length - 1].date;
    }

    const recs = [];
    if (totalInterviewers > totalResponses) {
      recs.push("Trigger automated reminders to remaining pending interviewers.");
    }
    if (recs.length === 0) {
      recs.push("Operational parameters are within bounds.");
    }

    return this.formatInsights({
      most_selected: mostSelectedDate,
      least_selected: leastSelectedDate,
      recommendation: recs.join(" ")
    });
  }
};
