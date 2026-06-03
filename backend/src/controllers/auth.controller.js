const db = require('../config/db');
const generateToken = require('../utils/generateToken');
const responseHandler = require('../utils/responseHandler');

module.exports = {
  // HR Admin Login
  async adminLogin(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
      return responseHandler.badRequest(res, 'Email and password are required.');
    }

    try {
      const user = await db.get(
        `SELECT * FROM users WHERE email = ? AND role = 'admin'`,
        [email.toLowerCase().trim()]
      );

      if (!user) {
        return responseHandler.unauthorized(res, 'Invalid credentials.');
      }

      // Simple password check
      if (user.password !== password) {
        return responseHandler.unauthorized(res, 'Invalid credentials.');
      }

      // Generate JWT Token
      const token = generateToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });

      return responseHandler.success(res, {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }, 'HR Admin logged in successfully.');
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to process Admin login.');
    }
  },

  // Interviewer Login (Credentials-free, auto-registers)
  async interviewerLogin(req, res) {
    const { email, name, phone_number } = req.body;

    if (!email || !name || !phone_number) {
      return responseHandler.badRequest(res, 'Email, name, and phone number are required.');
    }

    try {
      let user = await db.get(
        `SELECT * FROM users WHERE email = ? AND role = 'interviewer'`,
        [email.toLowerCase().trim()]
      );

      if (user) {
        // Update details
        await db.run(
          `UPDATE users SET name = ?, phone_number = ? WHERE id = ?`,
          [name.trim(), phone_number.trim(), user.id]
        );
        user.name = name.trim();
        user.phone_number = phone_number.trim();
      } else {
        // Auto register
        const result = await db.run(
          `INSERT INTO users (email, name, phone_number, role) VALUES (?, ?, ?, 'interviewer')`,
          [email.toLowerCase().trim(), name.trim(), phone_number.trim()]
        );
        user = {
          id: result.insertId,
          email: email.toLowerCase().trim(),
          name: name.trim(),
          phone_number: phone_number.trim(),
          role: 'interviewer'
        };
      }

      // Generate JWT Token
      const token = generateToken({
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'interviewer'
      });

      return responseHandler.success(res, {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone_number: user.phone_number,
          role: 'interviewer'
        }
      }, 'Interviewer logged in successfully.');
    } catch (error) {
      return responseHandler.error(res, error, 'Failed to process Interviewer login.');
    }
  }
};
