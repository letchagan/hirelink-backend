const responseHandler = require('../utils/responseHandler');

module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return responseHandler.forbidden(res, 'Access denied. You do not have sufficient permissions.');
    }
    next();
  };
};
