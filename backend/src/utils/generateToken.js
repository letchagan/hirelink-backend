const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

module.exports = (payload) => {
  return jwt.sign(payload, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn
  });
};
