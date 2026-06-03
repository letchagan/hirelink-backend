import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Bell, Menu, Moon, Sun } from 'lucide-react';

export default ({ toggleSidebar }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('hirescheduler_theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.body.classList.add('dark-theme');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('hirescheduler_theme', 'light');
      setIsDark(false);
    } else {
      document.body.classList.add('dark-theme');
      localStorage.setItem('hirescheduler_theme', 'dark');
      setIsDark(true);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'HS';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const handleBrandClick = () => {
    if (!user) {
      navigate('/login');
    } else if (user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/interviewer');
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <button 
          onClick={toggleSidebar} 
          className="nav-icon"
          style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center' }}
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>
        <div 
          onClick={handleBrandClick}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
          title="Go to Home Dashboard"
        >
          <div className="nav-logo">
            <Briefcase size={24} strokeWidth={2.5} />
          </div>
          <span className="nav-title">HireScheduler AI</span>
        </div>
      </div>

      <div className="nav-actions">
        <button 
          onClick={toggleTheme} 
          className="nav-icon" 
          style={{ border: 'none', background: 'transparent', display: 'flex', alignItems: 'center' }}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="nav-icon" title="Notifications">
          <Bell size={20} />
        </div>
        
        {user && (
          <div className="nav-profile">
            <div className="profile-avatar">
              {getInitials(user.name)}
            </div>
            <div className="profile-info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="profile-name" style={{ lineHeight: '1.2' }}>{user.name}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                {user.role}
              </span>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
