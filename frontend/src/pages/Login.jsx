import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Briefcase, Mail, Shield, User, HelpCircle, CheckCircle2, Phone, Eye, EyeOff } from 'lucide-react';

export default () => {
  const { user, adminLogin, interviewerLogin } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState('interviewer'); // 'admin', 'interviewer'

  // Interviewer fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Admin fields
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Automatically bypass login if user has a valid active session
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/interviewer/availability', { replace: true });
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (role === 'admin') {
        await adminLogin(adminEmail, adminPassword);
        setSuccessMsg('Logged in as HR Admin. Redirecting to Dashboard...');
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 1000);
      } else {
        if (!name || !phone) {
          setError('Name and phone number are required.');
          setLoading(false);
          return;
        }
        
        // Use a placeholder email since the field is hidden
        const submitEmail = email || `${phone}@placeholder.com`;
        await interviewerLogin(name, submitEmail, phone);
        setSuccessMsg('Profile authenticated. Loading availability form...');
        setTimeout(() => {
          navigate('/interviewer/availability', { replace: true });
        }, 1000);
      }
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  };

  return (
    <div className="login-container animate-fade">
      {/* Left Section: Branding & Highlights */}
      <div className="login-left">
        <div className="login-brand">
          <Briefcase size={36} strokeWidth={2.5} />
          <h2 style={{ color: '#ffffff', fontSize: '1.75rem', fontWeight: '800' }}>HireScheduler</h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h1 className="login-tagline">Collect Interviewer Availability Effortlessly.</h1>
          <p style={{ color: '#E2E8F0', fontSize: '1.05rem', fontWeight: '400', maxWidth: '480px' }}>
            Empower your recruitment operations with optimized capacity scheduling and Online/Offline slot collections.
          </p>
        </div>

        <div className="login-highlight-box">
          <h4 style={{ color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <CheckCircle2 size={18} /> Direct Features Included
          </h4>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#E2E8F0' }}>
            <li>• Credential-free Interviewer Login (Email, Name, Phone Number)</li>
            <li>• Capacity constraint-enforced slot booking</li>
            <li>• Custom Online vs Offline slot type allocations</li>
            <li>• Exportable Excel (.xlsx) and CSV spreadsheets</li>
            <li>• Gmail SMTP automated reminder delivery</li>
          </ul>
        </div>

        <p style={{ fontSize: '0.8rem', color: '#93C5FD' }}>
          © 2026 HireScheduler Corp. All rights reserved.
        </p>
      </div>

      {/* Right Section: Form Context */}
      <div className="login-right">
        <div className="card login-card animate-fade">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: '700' }}>Welcome to Portal</h2>
            <p style={{ marginTop: '4px' }}>Please complete details to enter the scheduler</p>
          </div>

          {/* Role selector tab */}
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '24px'
          }}>
            <button
              onClick={() => { setRole('interviewer'); setError(''); }}
              type="button"
              className="btn btn-sm"
              style={{
                flex: 1,
                borderRadius: '6px',
                height: '40px',
                border: 'none',
                backgroundColor: role === 'interviewer' ? 'var(--primary)' : 'transparent',
                color: role === 'interviewer' ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: role === 'interviewer' ? 'var(--shadow)' : 'none',
                fontWeight: '600'
              }}
            >
              <User size={16} style={{ marginRight: '6px' }} /> Interviewer
            </button>
            <button
              onClick={() => { setRole('admin'); setError(''); }}
              type="button"
              className="btn btn-sm"
              style={{
                flex: 1,
                borderRadius: '6px',
                height: '40px',
                border: 'none',
                backgroundColor: role === 'admin' ? 'var(--primary)' : 'transparent',
                color: role === 'admin' ? '#ffffff' : 'var(--text-secondary)',
                boxShadow: role === 'admin' ? 'var(--shadow)' : 'none',
                fontWeight: '600'
              }}
            >
              <Shield size={16} style={{ marginRight: '6px' }} /> HR Admin
            </button>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {successMsg && <div className="alert alert-success">{successMsg}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {role === 'interviewer' ? (
              <>
                {/* Interviewer Form Fields */}
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      placeholder="e.g. John"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '44px' }}
                    />
                    <User size={18} style={{
                      position: 'absolute',
                      left: '16px',
                      top: '15px',
                      color: 'var(--text-secondary)'
                    }} />
                  </div>
                </div>

                {/* Hiding Email Address form as requested (for future use) */}
                {false && (
                  <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="email"
                        required
                        placeholder="e.g. john@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="form-input"
                        style={{ paddingLeft: '44px' }}
                      />
                      <Mail size={18} style={{
                        position: 'absolute',
                        left: '16px',
                        top: '15px',
                        color: 'var(--text-secondary)'
                      }} />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9678845155"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '44px' }}
                    />
                    <Phone size={18} style={{
                      position: 'absolute',
                      left: '16px',
                      top: '15px',
                      color: 'var(--text-secondary)'
                    }} />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Admin Form Fields */}
                <div className="form-group">
                  <label className="form-label">HR Admin Email</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="email"
                      required
                      placeholder="hr@hirescheduler.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '44px' }}
                    />
                    <Mail size={18} style={{
                      position: 'absolute',
                      left: '16px',
                      top: '15px',
                      color: 'var(--text-secondary)'
                    }} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '44px', paddingRight: '44px' }}
                    />
                    <Shield size={18} style={{
                      position: 'absolute',
                      left: '16px',
                      top: '15px',
                      color: 'var(--text-secondary)'
                    }} />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '12px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', border: 'none' }}
            >
              {loading ? 'Authenticating...' : role === 'interviewer' ? 'Access Availability Form' : 'Log in as HR Admin'}
            </button>
          </form>



        </div>
      </div>
    </div>
  );
};
