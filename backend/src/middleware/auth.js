const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const responseHandler = require('../utils/responseHandler');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return responseHandler.unauthorized(res, 'Access denied. No token provided.');
  }

  try {
    const decoded = jwt.verify(token, jwtConfig.secret);
    req.user = decoded;
    next();
  } catch (error) {
    return responseHandler.unauthorized(res, 'Invalid token or token expired.');
  }
};
