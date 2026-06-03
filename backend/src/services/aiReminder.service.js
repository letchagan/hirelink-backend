const { spawn } = require('child_process');
const aiConfig = require('../config/ai');

module.exports = {
  async generateReminder(name, email, deadline) {
    return new Promise((resolve) => {
      const payload = {
        action: 'reminder',
        data: { name, email, deadline }
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
        console.warn('AI Python Process missing or failed. Activating native JS fallback...', err.message);
        resolve(this.jsFallback(name, email, deadline));
      });

      pyProcess.on('close', (code) => {
        if (code !== 0) {
          console.warn(`AI Python Process exited with code ${code}. Activating native JS fallback...`);
          return resolve(this.jsFallback(name, email, deadline));
        }
        try {
          const parsed = JSON.parse(stdoutData.trim());
          resolve(parsed);
        } catch (e) {
          console.warn('AI Python Process output parsing failed. Activating native JS fallback...');
          resolve(this.jsFallback(name, email, deadline));
        }
      });

      pyProcess.stdin.write(JSON.stringify(payload));
      pyProcess.stdin.end();
    });
  },

  jsFallback(name, email, deadline) {
    const subject = "Action Required: Interview Availability Submission Reminder";
    const body = (
      `Hi ${name},\n\n` +
      `We noticed that you have not submitted your availability for our upcoming hiring campaign.\n\n` +
      `To ensure a balanced workload and efficient staffing, please log into the HireScheduler portal ` +
      `and submit your available interview slots before the deadline: ${deadline}.\n\n` +
      `Thank you for your active support in growing our teams.\n\n` +
      `Best Regards,\n` +
      `HR Recruitment Team`
    );

    return {
      success: true,
      subject,
      body
    };
  }
};
