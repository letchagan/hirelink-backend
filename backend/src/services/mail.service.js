const mailConfig = require('../config/mail');

module.exports = {
  async sendOTP(email, otp) {
    console.log('----------------------------------------------------');
    console.log('✉️  [SIMULATED EMAIL SERVICE] - OTP VERIFICATION');
    console.log(`To: ${email}`);
    console.log(`From: ${mailConfig.sender}`);
    console.log(`Subject: HireScheduler Verification Passcode`);
    console.log(`Your OTP Code is: ${otp}`);
    console.log(`Valid for 5 minutes.`);
    console.log('----------------------------------------------------');
    return true;
  },

  async sendReminder(email, subject, body) {
    console.log('----------------------------------------------------');
    console.log('✉️  [SIMULATED EMAIL SERVICE] - AI REMINDER SENT');
    console.log(`To: ${email}`);
    console.log(`From: ${mailConfig.sender}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content:\n${body}`);
    console.log('----------------------------------------------------');
    return true;
  }
};
