import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Eye, Mail, CheckCircle, AlertCircle, Search, RefreshCw, Phone, User, MessageSquare, Monitor, MapPin } from 'lucide-react';

export default () => {
  const [campaign, setCampaign] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'responded', 'pending'
  
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null); // id of interviewer being emailed
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Selected interviewer for detail drawer
  const [selectedInterviewer, setSelectedInterviewer] = useState(null);

  const fetchCampaignAndStatuses = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch latest campaign
      const campaignRes = await api.get('/api/admin/campaigns');
      const latest = campaignRes.data.data[0];
      
      if (!latest) {
        setLoading(false);
        return;
      }
      
      setCampaign(latest);

      // Fetch availability list to compare responded status
      const reportRes = await api.get(`/api/reports/availability?campaignId=${latest.id}`);
      setStatuses(reportRes.data.data);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch campaign submission statuses.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignAndStatuses();
  }, []);

  const handleSendAiEmail = async (row) => {
    setError('');
    setSuccess('');
    setActionLoadingId(row.email); // Set loading state for this email row

    try {
      const res = await api.post('/api/ai/send-ai-email', {
        email: row.email,
        name: row.name,
        deadline: new Date(campaign.deadline).toLocaleString(),
        campaignName: campaign.name
      });

      const { sentReal, logsMessage } = res.data.data;

      if (sentReal) {
        setSuccess(`Success! Nodemailer successfully dispatched a real Gmail SMTP reminder to ${row.name} (${row.email}).`);
      } else {
        setSuccess(`Success! reminder triggered in Simulated Mode for ${row.name} (Gmail credentials not configured in backend .env). Check server logs!`);
      }

      setActionLoadingId(null);
      
      // Clear alert after 5 seconds
      setTimeout(() => setSuccess(''), 6000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to dispatch AI reminder email.');
      setActionLoadingId(null);
    }
  };

  const handleViewDetails = async (row) => {
    try {
      const res = await api.post('/api/interviewer/load-existing', { email: row.email });
      const details = res.data.data;
      
      // Map slots to show dates
      const datesRes = await api.get(`/api/admin/campaigns/${campaign.id}`);
      const cDetails = datesRes.data.data;

      const fullSlots = details.selections.map(sel => {
        const dObj = cDetails.dates.find(d => d.id === sel.dateId);
        return {
          date: dObj ? dObj.date : 'Unknown',
          slotType: sel.slotType,
          location: dObj ? dObj.location : ''
        };
      });

      setSelectedInterviewer({
        name: details.user.name,
        email: details.user.email,
        phone: details.user.phone_number,
        comments: details.comments,
        selections: fullSlots
      });
    } catch (e) {
      setError('Failed to fetch selection details for this interviewer.');
    }
  };

  const filtered = statuses.filter((row) => {
    const term = searchTerm.toLowerCase();
    const hasSubmitted = row.slot1 !== '-';
    
    const matchesSearch = (
      row.name.toLowerCase().includes(term) ||
      row.email.toLowerCase().includes(term) ||
      row.phone_number.toLowerCase().includes(term)
    );

    if (!matchesSearch) return false;

    if (statusFilter === 'responded') return hasSubmitted;
    if (statusFilter === 'pending') return !hasSubmitted;
    
    return true;
  });

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
        <AlertCircle size={48} style={{ color: 'var(--warning)', marginBottom: '16px' }} />
        <h3>No Campaigns Available</h3>
        <p style={{ marginTop: '8px' }}>Create an availability campaign first.</p>
      </div>
    );
  }

  // Count responses
  const total = statuses.length;
  const responded = statuses.filter(s => s.slot1 !== '-').length;
  const pending = total - responded;
  const rate = total > 0 ? Math.round((responded / total) * 100) : 0;

  return (
    <div className="animate-fade" style={{ paddingBottom: '40px' }}>
      
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Eye size={32} style={{ color: 'var(--primary)' }} />
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Monitor Interviewer Responses</h2>
            <p>Active Drive: <strong style={{ color: 'var(--primary)' }}>{campaign.name}</strong></p>
          </div>
        </div>

        <button onClick={fetchCampaignAndStatuses} className="btn btn-secondary" style={{ height: '40px' }}>
          <RefreshCw size={16} /> Refresh board
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={20} /> {success}</div>}

      {/* Stats Cards Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Interviewers</span>
          <h3 style={{ fontSize: '1.4rem', marginTop: '2px' }}>{total} registered</h3>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Responded Count</span>
          <h3 style={{ fontSize: '1.4rem', marginTop: '2px', color: 'var(--success)' }}>{responded} completed</h3>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--warning)' }}>Pending Submissions</span>
          <h3 style={{ fontSize: '1.4rem', marginTop: '2px', color: 'var(--warning)' }}>{pending} outstanding</h3>
        </div>
        <div className="card" style={{ padding: '16px 20px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>Participation Rate</span>
          <h3 style={{ fontSize: '1.4rem', marginTop: '2px', color: 'var(--primary)' }}>{rate}%</h3>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedInterviewer ? '1.5fr 1fr' : '1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Main List Table */}
        <div className="card table-card">
          <div className="table-header-bar" style={{ gap: '16px' }}>
            <h3 style={{ fontSize: '1.1rem' }}>Interviewer Response Board</h3>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {/* Status Filter Tab */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-input"
                style={{ width: '130px', height: '38px', fontSize: '0.8rem', padding: '0 8px' }}
              >
                <option value="all">All Statuses</option>
                <option value="responded">Responded</option>
                <option value="pending">Pending</option>
              </select>

              {/* Search input */}
              <div style={{ position: 'relative', width: '220px' }}>
                <input
                  type="text"
                  placeholder="Search name, email, phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
                />
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-secondary)' }} />
              </div>
            </div>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Interviewer Details</th>
                  <th>email</th>
                  <th>phone number</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((row) => {
                    const hasSubmitted = row.slot1 !== '-';
                    const isRowActionLoading = actionLoadingId === row.email;
                    
                    return (
                      <tr key={row.email}>
                        <td style={{ fontWeight: '600' }}>
                          <span style={{ cursor: hasSubmitted ? 'pointer' : 'default', color: hasSubmitted ? 'var(--primary)' : 'inherit' }} onClick={() => hasSubmitted && handleViewDetails(row)}>
                            {row.name}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{row.email}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{row.phone_number}</td>
                        <td>
                          <span className={`badge ${hasSubmitted ? 'badge-low' : 'badge-medium'}`} style={{ fontSize: '0.65rem' }}>
                            {hasSubmitted ? 'Responded' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {hasSubmitted ? (
                            <button
                              onClick={() => handleViewDetails(row)}
                              className="btn btn-secondary btn-sm"
                              style={{ height: '30px', padding: '0 10px', fontSize: '0.75rem' }}
                            >
                              <Eye size={12} /> View Details
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSendAiEmail(row)}
                              disabled={isRowActionLoading}
                              className="btn btn-primary btn-sm"
                              style={{ 
                                height: '30px', 
                                padding: '0 10px', 
                                fontSize: '0.75rem',
                                backgroundColor: 'var(--primary)',
                                border: 'none'
                              }}
                            >
                              <Mail size={12} /> {isRowActionLoading ? 'Sending...' : 'Send AI Email'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                      No interviewers found matching criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Interviewer Slots Drawer Details */}
        {selectedInterviewer && (
          <div className="card animate-fade" style={{ position: 'sticky', top: '90px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <User size={18} style={{ color: 'var(--primary)' }} /> Interviewer Selections
              </h3>
              <button 
                onClick={() => setSelectedInterviewer(null)}
                className="btn btn-secondary btn-sm"
                style={{ height: '24px', padding: '0 6px', fontSize: '0.7rem' }}
              >
                Close Drawer
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Interviewer Information</span>
                <h4 style={{ fontSize: '1.2rem', marginTop: '2px' }}>{selectedInterviewer.name}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  <span>📧 Email: <strong>{selectedInterviewer.email}</strong></span>
                  <span>📞 Phone: <strong>{selectedInterviewer.phone}</strong></span>
                </p>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Declared Available Dates</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedInterviewer.selections.map((sel, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{sel.date}</span>
                      
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '50px', backgroundColor: sel.slotType === 'online' ? 'rgb(37 99 235 / 0.08)' : 'rgb(34 197 94 / 0.08)', color: sel.slotType === 'online' ? 'var(--primary)' : 'var(--success)', fontWeight: '600' }}>
                        {sel.slotType === 'online' ? <Monitor size={10} /> : <MapPin size={10} />}
                        {sel.slotType === 'online' ? 'Online' : `Offline (${sel.location || 'HQ Office'})`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                  <MessageSquare size={12} style={{ marginRight: '4px' }} /> Interviewer Comments
                </span>
                <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-primary)', border: '1px solid var(--border)', minHeight: '60px', fontStyle: selectedInterviewer.comments ? 'normal' : 'italic' }}>
                  {selectedInterviewer.comments || 'No comments declared by interviewer.'}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
