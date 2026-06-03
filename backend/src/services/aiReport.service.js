const { spawn } = require('child_process');
const aiConfig = require('../config/ai');

module.exports = {
  async generateReport(totalInterviewers, totalResponses, dates) {
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
    const pending = Math.max(0, totalInterviewers - totalResponses);
    let mostSelectedDate = "None";
    let leastSelectedDate = "None";

    if (dates && dates.length > 0) {
      const sorted = [...dates].sort((a, b) => a.selections - b.selections);
      leastSelectedDate = `${sorted[0].date} (${sorted[0].selections} selections)`;
      mostSelectedDate = `${sorted[sorted.length - 1].date} (${sorted[sorted.length - 1].selections} selections)`;
    }

    const recs = [];
    if (pending > 0) {
      recs.push("Trigger automated reminders to remaining pending interviewers.");
    }
    if (dates && dates.length > 0) {
      const sorted = [...dates].sort((a, b) => a.selections - b.selections);
      if (sorted[0].selections < 5) {
        recs.push(`Consider merging interview schedules on low-demand dates like ${sorted[0].date}.`);
      }
      if (sorted[sorted.length - 1].selections > 15) {
        recs.push(`Increase capacity or allocate backup staff for high-demand dates like ${sorted[sorted.length - 1].date}.`);
      }
    }

    if (recs.length === 0) {
      recs.push("Schedule operations are performing exceptionally. Continue with current allocations.");
    }

    const summary = (
      `Campaign Summary\n` +
      `Total Interviewers: {totalInterviewers}\n` +
      `Responses Received: {totalResponses}\n` +
      `Pending Responses: {pending}\n` +
      `Most Selected Date: {mostSelectedDate}\n` +
      `Least Selected Date: {leastSelectedDate}`
    )
      .replace('{totalInterviewers}', totalInterviewers)
      .replace('{totalResponses}', totalResponses)
      .replace('{pending}', pending)
      .replace('{mostSelectedDate}', mostSelectedDate)
      .replace('{leastSelectedDate}', leastSelectedDate);

    return {
      success: true,
      summary,
      most_selected: mostSelectedDate,
      least_selected: leastSelectedDate,
      recommendation: recs.join(" ")
    };
  }
};
