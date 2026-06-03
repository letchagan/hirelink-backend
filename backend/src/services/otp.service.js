const db = require('../config/db');
const generateOTP = require('../utils/generateOTP');
const mailService = require('./mail.service');

module.exports = {
  async sendOTP(email, employeeId = null) {
    const otp = generateOTP();
    // Expiration set to 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Format datetime string for DB compatibility
    const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    // Store in DB
    await db.run(
      `INSERT INTO otps (email, employee_id, otp, expires_at) VALUES (?, ?, ?, ?)`,
      [email, employeeId, otp, expiresAtStr]
    );

    // Trigger simulated/real email
    await mailService.sendOTP(email, otp);

    return otp;
  },

  async verifyOTP(email, employeeId, otp) {
    const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let row;

    if (employeeId) {
      row = await db.get(
        `SELECT * FROM otps WHERE employee_id = ? AND otp = ? AND expires_at > ? ORDER BY id DESC LIMIT 1`,
        [employeeId, otp, nowStr]
      );
    } else {
      row = await db.get(
        `SELECT * FROM otps WHERE email = ? AND otp = ? AND expires_at > ? ORDER BY id DESC LIMIT 1`,
        [email, otp, nowStr]
      );
    }

    if (!row) {
      return false;
    }

    // Clean up used OTPs
    await db.run(`DELETE FROM otps WHERE email = ?`, [row.email]);
    return row.email;
  }
};
