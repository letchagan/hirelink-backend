require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./src/routes/auth.routes');
const adminRoutes = require('./src/routes/admin.routes');
const interviewerRoutes = require('./src/routes/interviewer.routes');
const reportRoutes = require('./src/routes/report.routes');
const aiRoutes = require('./src/routes/ai.routes');
const responseHandler = require('./src/utils/responseHandler');

const app = express();

// Configure CORS for React frontend client integration
app.use(cors({
  origin: '*', // Allow all origins for local testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/interviewer', interviewerRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/ai', aiRoutes);

// Serves static client builds if requested (optional)
app.use(express.static(path.join(__dirname, 'public')));

// Global 404 Route handler
app.use((req, res) => {
  return responseHandler.notFound(res, 'API endpoint not found.');
});

// Global internal error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  return responseHandler.error(res, err, 'Internal server error occurred.');
});

module.exports = app;
