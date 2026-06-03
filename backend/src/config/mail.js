module.exports = {
  sender: process.env.MAIL_SENDER || 'noreply@hirescheduler.com',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: process.env.SMTP_PORT || 2525,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  }
};
