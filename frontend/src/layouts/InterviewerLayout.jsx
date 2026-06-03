import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

export default () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    setMobileOpen(!mobileOpen);
  };

  return (
    <div className="layout-root">
      <Navbar toggleSidebar={toggleSidebar} />
      
      <div className="layout-container">
        <Sidebar collapsed={sidebarCollapsed} isMobileOpen={mobileOpen} />
        
        <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
