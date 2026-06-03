const path = require('path');

module.exports = {
  pythonPath: process.env.PYTHON_PATH || 'python',
  scriptPath: path.resolve(__dirname, '../services/ai_engine.py')
};
