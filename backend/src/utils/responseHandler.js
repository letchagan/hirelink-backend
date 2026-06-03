// Utility helper to send standard JSON responses

module.exports = {
  success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  },

  error(res, error, message = 'An error occurred', statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      message,
      error: error && error.message ? error.message : error
    });
  },

  badRequest(res, message = 'Bad request') {
    return res.status(400).json({
      success: false,
      message
    });
  },

  unauthorized(res, message = 'Unauthorized access') {
    return res.status(401).json({
      success: false,
      message
    });
  },

  forbidden(res, message = 'Access forbidden') {
    return res.status(403).json({
      success: false,
      message
    });
  },

  notFound(res, message = 'Resource not found') {
    return res.status(404).json({
      success: false,
      message
    });
  }
};
