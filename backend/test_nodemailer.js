require('dotenv').config();
const nodemailer = require('nodemailer');

const emailUser = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
const emailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : '';

console.log('Testing Nodemailer with:');
console.log('EMAIL_USER:', emailUser);
console.log('EMAIL_PASS length:', emailPass.length);

if (!emailUser || !emailPass) {
  console.error('Error: EMAIL_USER and EMAIL_PASS must be configured in your .env file!');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: emailUser,
    pass: emailPass
  }
});

const mailOptions = {
  from: emailUser,
  to: 'ssmbjegan@gmail.com',
  subject: 'HireLink SMTP Email Test',
  text: 'Hello!\n\nThis is a real-time SMTP test email sent via Nodemailer from your HireScheduler AI Coordinator application.\n\nIf you received this, your Gmail App Password SMTP configuration is working 100% perfectly!\n\nBest Regards,\nHireLink System Coordinator'
};

console.log('Sending test email...');
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Nodemailer SMTP Dispatch Failed:', error);
  } else {
    console.log('Nodemailer SMTP Dispatch Succeeded!');
    console.log('Response:', info.response);
    console.log('Message ID:', info.messageId);
  }
});
