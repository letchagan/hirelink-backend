import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { Mail, Send, Eye, RefreshCw, Edit2 } from 'lucide-react';

export default () => {
  const location = useLocation();

  // Route states passing (optional)
  const { name: routeName, email: routeEmail, deadline: routeDeadline } = location.state || {};

  // Form selections states
  const [pendingInterviewers, setPendingInterviewers] = useState([]);
  const [selectedInterviewer, setSelectedInterviewer] = useState(null);
  
  // Custom draft email states
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [deadlineStr, setDeadlineStr] = useState('');

  const [loading, setLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPendingInterviewers = async () => {
    try {
      setLoading(true);
      setError('');
      
      const campaignRes = await api.get('/api/admin/campaigns');
      const latest = campaignRes.data.data[0];
      
      if (!latest) {
        setLoading(false);
        return;
      }
      
      setDeadlineStr(new Date(latest.deadline).toLocaleString());

      // Fetch availability list to extract pending candidates
      const reportRes = await api.get(`/api/reports/availability?campaignId=${latest.id}`);
      const pendings = reportRes.data.data.filter(s => s.date1 === '-');
      
      setPendingInterviewers(pendings);
      
      // If we have route selections passed from Monitor page, handle immediately
      if (routeName && routeEmail) {
        const routeObj = { name: routeName, email: routeEmail };
        setSelectedInterviewer(routeObj);
        await generateDraft(routeName, routeEmail, routeDeadline || new Date(latest.deadline).toLocaleString());
      } else if (pendings.length > 0) {
        setSelectedInterviewer(pendings[0]);
        await generateDraft(pendings[0].name, pendings[0].employeeId + '@hirescheduler.com', new Date(latest.deadline).toLocaleString());
      }
      
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch pending interviewers.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingInterviewers();
  }, []);

  const generateDraft = async (name, email, deadlineVal) => {
    try {
      setDraftLoading(true);
      setError('');
      setSuccess('');
      
      const res = await api.post('/api/ai/reminder', {
        name,
        email,
        deadline: deadlineVal
      });

      const { subject, body } = res.data.data;
      setEmailSubject(subject);
      setEmailBody(body);
      
      setDraftLoading(false);
    } catch (err) {
      setError('Failed to generate AI email template.');
      setDraftLoading(false);
    }
  };

  const handleInterviewerChange = async (e) => {
    const idx = e.target.value;
    const intv = pendingInterviewers[idx];
    if (!intv) return;
    
    setSelectedInterviewer(intv);
    await generateDraft(intv.name, intv.employeeId + '@hirescheduler.com', deadlineStr);
  };

  const handleSend = async () => {
    if (!selectedInterviewer) return;
    
    setError('');
    setSuccess('');
    setSendLoading(true);

    try {
      const emailVal = selectedInterviewer.email || (selectedInterviewer.employeeId + '@hirescheduler.com');
      
      await api.post('/api/ai/reminder/send', {
        email: emailVal,
        subject: emailSubject,
        body: emailBody
      });

      setSuccess(`AI reminder email successfully dispatched to ${selectedInterviewer.name} (Simulated). Check server console!`);
      setSendLoading(false);
    } catch (err) {
      setError('Failed to dispatch simulated reminder email.');
      setSendLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade" style={{ maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <Mail size={32} style={{ color: 'var(--primary)' }} />
        <div>
          <h2>AI Automated Reminders</h2>
          <p>Generate, preview, customize, and dispatch personalized scheduling reminders to pending staff</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '32px', alignItems: 'flex-start' }}>
        
        {/* Left Side: Selector and controls */}
        <div className="card">
          <h3 style={{ marginBottom: '20px' }}>Campaign Controls</h3>

          {/* Selector dropdown */}
          {!routeName && pendingInterviewers.length > 0 ? (
            <div className="form-group">
              <label className="form-label">Awaiting Staff Member</label>
              <select 
                onChange={handleInterviewerChange}
                className="form-input"
                style={{ appearance: 'auto' }}
              >
                {pendingInterviewers.map((item, idx) => (
                  <option key={item.employeeId} value={idx}>
                    {item.name} ({item.employeeId})
                  </option>
                ))}
              </select>
            </div>
          ) : routeName ? (
            <div style={{ 
              marginBottom: '20px', 
              padding: '12px 16px', 
              backgroundColor: 'var(--bg)', 
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)' 
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Target Candidate</span>
              <h4 style={{ fontSize: '1.1rem', marginTop: '2px' }}>{routeName}</h4>
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--success)', fontWeight: '600' }}>
              🎉 Excellent! No pending responses remaining for this campaign!
            </p>
          )}

          {selectedInterviewer && (
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Target Email:</span>
                <span style={{ fontWeight: '600' }}>{selectedInterviewer.email || (selectedInterviewer.employeeId + '@hirescheduler.com')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Deadline Limit:</span>
                <span style={{ fontWeight: '600' }}>{deadlineStr || 'Tomorrow'}</span>
              </div>
            </div>
          )}

        </div>

        {/* Right Side: High Fidelity Mail Preview & Editor */}
        {selectedInterviewer ? (
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid var(--border)', 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'var(--bg)'
            }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={18} /> Interactive Mail Editor
              </h3>
              
              {draftLoading && (
                <RefreshCw size={14} className="spinner" style={{ color: 'var(--primary)' }} />
              )}
            </div>

            {/* Email Header Metadata */}
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '60px' }}>To:</span>
                <input 
                  type="text" 
                  disabled
                  value={`${selectedInterviewer.name} <${selectedInterviewer.email || (selectedInterviewer.employeeId + '@hirescheduler.com')}>`}
                  className="form-input"
                  style={{ height: '36px', fontSize: '0.85rem', backgroundColor: 'var(--bg)' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', minWidth: '60px' }}>Subject:</span>
                <input 
                  type="text" 
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="form-input"
                  style={{ height: '36px', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            {/* Editable Content Body */}
            <div style={{ padding: '24px' }}>
              <textarea
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="form-input"
                style={{ 
                  minHeight: '280px', 
                  fontSize: '0.92rem', 
                  lineHeight: '1.6', 
                  padding: '16px',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Form actions footer bar */}
            <div style={{ padding: '20px 24px', backgroundColor: 'var(--bg)', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={handleSend}
                disabled={sendLoading || draftLoading}
                className="btn btn-primary"
                style={{ height: '42px', fontSize: '0.85rem' }}
              >
                <Send size={14} /> {sendLoading ? 'Dispatching simulated email...' : 'Send Reminder Email'}
              </button>
            </div>

          </div>
        ) : (
          <div className="card" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Please select a candidate to compose reminder mail.
          </div>
        )}

      </div>

    </div>
  );
};
