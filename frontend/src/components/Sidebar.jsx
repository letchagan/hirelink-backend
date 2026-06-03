import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  CalendarPlus, 
  Users, 
  Eye, 
  FileSpreadsheet, 
  Sparkles, 
  ShieldAlert, 
  BarChart4, 
  Mail, 
  LogOut,
  Calendar,
  Clock
} from 'lucide-react';

export default ({ collapsed, isMobileOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const adminLinks = [
    { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { to: '/admin/create-campaign', label: 'Create Campaign', icon: <CalendarPlus size={18} /> },
    { to: '/admin/monitor-responses', label: 'Monitor Responses', icon: <Eye size={18} /> },
    { to: '/admin/reports', label: 'Reports', icon: <FileSpreadsheet size={18} /> },
    { to: '/admin/ai-schedule', label: 'AI Scheduling', icon: <Sparkles size={18} /> },
    { to: '/admin/mail-logs', label: 'Email Audit Logs', icon: <Mail size={18} /> },
  ];

  const interviewerLinks = [
    { to: '/interviewer', label: 'Home Dashboard', icon: <Calendar size={18} /> },
    { to: '/interviewer/availability', label: 'Submit Availability', icon: <Clock size={18} /> },
  ];

  const links = user && user.role === 'admin' ? adminLinks : interviewerLinks;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span style={{ display: 'flex', alignItems: 'center' }}>
              {link.icon}
            </span>
            <span>{link.label}</span>
          </NavLink>
        ))}

        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />

        <button
          onClick={handleLogout}
          className="sidebar-link"
          style={{ 
            width: '100%', 
            textAlign: 'left', 
            background: 'none', 
            border: 'none', 
            color: 'var(--danger)',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <LogOut size={18} />
          </span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};
