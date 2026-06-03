import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { Users, Plus, Trash2, Search, Phone, Mail, User } from 'lucide-react';

export default () => {
  const [searchParams] = useSearchParams();
  const urlCampaignId = searchParams.get('campaign');

  const [interviewers, setInterviewers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(urlCampaignId || '');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Registering Form States
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const campRes = await api.get('/api/admin/campaigns');
      const campaignsList = campRes.data.data || [];
      setCampaigns(campaignsList);
      
      let targetId = selectedCampaignId;
      // If no campaign selected or URL had "all" (from old links), use the first active campaign
      if (!targetId || targetId === 'all') {
        if (campaignsList.length > 0) {
          targetId = campaignsList[0].id.toString();
          setSelectedCampaignId(targetId);
        }
      }

      if (targetId && targetId !== 'all') {
        const res = await api.get(`/api/admin/interviewers?campaignId=${targetId}`);
        setInterviewers(res.data.data || []);
      } else {
        setInterviewers([]);
      }
      setLoading(false);
    } catch (err) {
      setError('Failed to load interviewer directory.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleCampaignChange = async (campaignId) => {
    setSelectedCampaignId(campaignId);
    try {
      setLoading(true);
      const res = await api.get(`/api/admin/interviewers?campaignId=${campaignId}`);
      setInterviewers(res.data.data || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to load interviewers for selected campaign.');
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFormLoading(true);

    try {
      const payload = { 
        name, 
        phone_number: phone,
        campaignId: selectedCampaignId
      };
      await api.post('/api/admin/interviewers', payload);
      setSuccess('Interviewer successfully registered to the campaign pool.');
      
      // Clean up fields
      setName('');
      setEmail('');
      setPhone('');
      setShowAddForm(false);
      
      // Refresh list
      handleCampaignChange(selectedCampaignId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create interviewer.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to completely delete this interviewer profile globally?')) return;
    
    setError('');
    setSuccess('');
    try {
      await api.delete(`/api/admin/interviewers/${id}`);
      setSuccess('Interviewer profile deleted.');
      handleCampaignChange(selectedCampaignId);
    } catch (err) {
      setError('Failed to delete interviewer profile.');
    }
  };

  // Search filter
  const filtered = interviewers.filter((intv) => {
    const search = searchTerm.toLowerCase();
    const phoneVal = intv.phone_number ? intv.phone_number.toLowerCase() : '';
    return (
      intv.name.toLowerCase().includes(search) ||
      intv.email.toLowerCase().includes(search) ||
      phoneVal.includes(search)
    );
  });

  return (
    <div className="animate-fade" style={{ paddingBottom: '40px' }}>
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={32} style={{ color: 'var(--primary)' }} />
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Interviewer Roster Management</h2>
            <p>Maintain and organize the directory of qualified personnel assigned to active recruitment campaigns.</p>
          </div>
        </div>

        <button
          onClick={() => { setShowAddForm(!showAddForm); setError(''); setSuccess(''); }}
          className="btn btn-primary"
          style={{ border: 'none' }}
        >
          <Plus size={18} /> Add Interviewer
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Dynamic Campaign Selector Bar */}
      {campaigns.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>Filter Roster by Campaign:</span>
            <select
              value={selectedCampaignId}
              onChange={(e) => handleCampaignChange(e.target.value)}
              className="form-input"
              style={{ width: '280px', height: '40px', fontSize: '0.85rem', padding: '0 12px', marginBottom: 0 }}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.status === 'closed' ? '(Closed)' : ''}
                </option>
              ))}
            </select>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
            Showing: <strong>{filtered.length} interviewers</strong>
          </p>
        </div>
      )}

      {/* Add Interviewer Overlay Card */}
      {showAddForm && (
        <div className="card animate-fade" style={{ marginBottom: '32px', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ marginBottom: '8px', fontSize: '1.1rem' }}>Register New Interviewer</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            This will register the interviewer and instantly assign them to the currently selected campaign.
          </p>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '40px' }}
                  />
                  <User size={16} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-secondary)' }} />
                </div>
              </div>

                {/* Email field removed per request */}
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
                        style={{ paddingLeft: '40px' }}
                      />
                      <Mail size={16} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-secondary)' }} />
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
                    style={{ paddingLeft: '40px' }}
                  />
                  <Phone size={16} style={{ position: 'absolute', left: '14px', top: '16px', color: 'var(--text-secondary)' }} />
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={formLoading}
                className="btn btn-primary btn-sm"
                style={{ border: 'none' }}
              >
                {formLoading ? 'Registering...' : 'Add Interviewer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search Bar & Table Layout */}
      <div className="card table-card">
        <div className="table-header-bar">
          <h3 style={{ fontSize: '1.1rem' }}>Interviewer Directory</h3>
          <div className="table-actions">
            <div style={{ position: 'relative', width: '260px' }}>
              <input
                type="text"
                placeholder="Search by name, email, or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '40px', height: '40px', fontSize: '0.85rem' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-secondary)' }} />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loader-container">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Phone Number</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((intv) => (
                    <tr key={intv.id}>
                      <td style={{ fontWeight: '600' }}>{intv.name}</td>
                      <td>{intv.phone_number || '-'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleDelete(intv.id)}
                          className="btn btn-secondary btn-sm btn-danger"
                          style={{ 
                            padding: '6px 12px', 
                            height: '32px',
                            backgroundColor: '#FEE2E2',
                            border: 'none',
                            color: 'var(--danger)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Delete Interviewer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                      No interviewer records matched your search filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
