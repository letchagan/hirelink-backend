module.exports = {
  secret: process.env.JWT_SECRET || 'super_secret_hirescheduler_jwt_token_key_2026',
  expiresIn: '24h'
};
