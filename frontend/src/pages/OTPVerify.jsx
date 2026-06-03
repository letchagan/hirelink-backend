import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowLeft, KeySquare } from 'lucide-react';

export default () => {
  const { user, verifyOTP } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Extract navigation states
  const { role, email, employeeId } = location.state || {};

  // Auto-redirect logged-in sessions to dashboards to prevent history back loops
  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/interviewer', { replace: true });
    }
  }, [user, navigate]);

  // Redirect back to login if direct hit to route without credentials
  useEffect(() => {
    if (!user && !role && !email && !employeeId) {
      navigate('/login');
    }
  }, [user, role, email, employeeId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const user = await verifyOTP(email, employeeId, otp);
      setSuccessMsg('Authenticated! Redirecting to Dashboard...');
      
      setTimeout(() => {
        if (user.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/interviewer');
        }
      }, 1200);
    } catch (err) {
      setError(err);
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg)',
      padding: '24px'
    }} className="animate-fade">
      <div className="card" style={{ width: '100%', maxWidth: '440px', padding: '32px' }}>
        <button
          onClick={() => navigate('/login')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-secondary)',
            background: 'none',
            border: 'none',
            fontSize: '0.85rem',
            cursor: 'pointer',
            marginBottom: '24px',
            fontWeight: '500'
          }}
        >
          <ArrowLeft size={16} /> Back to Login
        </button>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgb(37 99 235 / 0.08)',
            color: 'var(--primary)',
            marginBottom: '16px'
          }}>
            <ShieldCheck size={32} />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Enter Passcode</h2>
          <p style={{ marginTop: '6px', fontSize: '0.85rem' }}>
            We've sent a 6-digit verification OTP to{' '}
            <strong>{email || employeeId}</strong>. Please check your local node console window.
          </p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {successMsg && <div className="alert alert-success">{successMsg}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label className="form-label">6-Digit Verification Code</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="e.g. 123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="form-input"
                style={{ 
                  paddingLeft: '44px', 
                  letterSpacing: '0.3em', 
                  fontSize: '1.2rem', 
                  fontWeight: '600',
                  textAlign: 'center'
                }}
              />
              <KeySquare size={18} style={{ 
                position: 'absolute', 
                left: '16px', 
                top: '15px', 
                color: 'var(--text-secondary)' 
              }} />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', border: 'none' }}
          >
            {loading ? 'Confirming...' : 'Verify & Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
