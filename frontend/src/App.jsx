import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Protected Route Guard
import ProtectedRoute from './routes/ProtectedRoute';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import InterviewerLayout from './layouts/InterviewerLayout';

// Public Pages
import Login from './pages/Login';

// Admin Pages
import Dashboard from './pages/admin/Dashboard';
import CreateCampaign from './pages/admin/CreateCampaign';
import ManageInterviewers from './pages/admin/ManageInterviewers';
import MonitorResponses from './pages/admin/MonitorResponses';
import Reports from './pages/admin/Reports';
import AISchedule from './pages/admin/AISchedule';

// Interviewer Pages
import Home from './pages/interviewer/Home';
import Availability from './pages/interviewer/Availability';

export default () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />

          {/* Secure Admin Portal Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="create-campaign" element={<CreateCampaign />} />
            <Route path="manage-interviewers" element={<ManageInterviewers />} />
            <Route path="monitor-responses" element={<MonitorResponses />} />
            <Route path="reports" element={<Reports />} />
            <Route path="ai-schedule" element={<AISchedule />} />
          </Route>

          {/* Secure Interviewer Portal Routes */}
          <Route 
            path="/interviewer" 
            element={
              <ProtectedRoute allowedRoles={['interviewer']}>
                <InterviewerLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Home />} />
            <Route path="availability" element={<Availability />} />
          </Route>

          {/* Fallback Catch-all Route */}
          <Route path="*" element={<Navigate to="/login" replace />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};
