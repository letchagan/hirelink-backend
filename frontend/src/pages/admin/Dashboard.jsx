import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  CheckCircle2, 
  HelpCircle, 
  Percent, 
  Sparkles, 
  CalendarRange, 
  Settings,
  Lock,
  Unlock,
  MapPin,
  Clock,
  Edit2,
  AlertTriangle,
  Plus,
  Trash2
} from 'lucide-react';

export default () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    campaignId: null,
    campaignName: 'Loading...',
    campaignLocation: '',
    campaignStatus: 'active',
    totalInterviewers: 0,
    totalResponses: 0,
    pendingResponses: 0,
    responsePercentage: 0
  });
  
  const [charts, setCharts] = useState({
    responseOverview: [],
    dateDistribution: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Multiple Campaigns state
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);

  // Edit Campaign State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editMaxSelectable, setEditMaxSelectable] = useState(3);
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editDeadline, setEditDeadline] = useState('');
  const [editDates, setEditDates] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  
  // Overlaps from edit
  const [overlapsList, setOverlapsList] = useState([]);
  const [showOverlapModal, setShowOverlapModal] = useState(false);

  const fetchDashboardData = async (campaignId = null) => {
    try {
      setLoading(true);
      setError('');

      // Fetch all campaigns
      const campaignsRes = await api.get('/api/admin/campaigns');
      const allCampaigns = campaignsRes.data.data || [];
      setCampaigns(allCampaigns);

      let targetId = campaignId;
      if (!targetId && allCampaigns.length > 0) {
        targetId = allCampaigns[0].id;
      }
      setSelectedCampaignId(targetId);

      if (targetId) {
        const statsRes = await api.get(`/api/admin/stats?campaignId=${targetId}`);
        setStats(statsRes.data.data);

        const chartsRes = await api.get(`/api/admin/charts?campaignId=${targetId}`);
        setCharts(chartsRes.data.data);
      } else {
        setStats({
          campaignId: null,
          campaignName: 'No Active Campaign',
          campaignLocation: '',
          campaignStatus: 'active',
          totalInterviewers: 0,
          totalResponses: 0,
          pendingResponses: 0,
          responsePercentage: 0
        });
        setCharts({ responseOverview: [], dateDistribution: [] });
      }
      
      setLoading(false);
    } catch (err) {
      setError('Failed to refresh dashboard stats.');
      setLoading(false);
    }
  };

  const handleCampaignChange = (campaignId) => {
    setSelectedCampaignId(campaignId);
    fetchDashboardData(campaignId);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleToggleStatus = async () => {
    if (!stats.campaignId) return;
    setError('');
    setSuccess('');
    
    const newStatus = stats.campaignStatus === 'active' ? 'closed' : 'active';
    try {
      await api.put(`/api/admin/campaigns/${stats.campaignId}/status`, { status: newStatus });
      setSuccess(`Hiring campaign has been successfully ${newStatus === 'closed' ? 'closed' : 'opened'}.`);
      fetchDashboardData(selectedCampaignId);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update campaign status.');
    }
  };

  const handleOpenEdit = async () => {
    if (!stats.campaignId) return;
    setEditError('');
    try {
      const res = await api.get(`/api/admin/campaigns/${stats.campaignId}`);
      const campaign = res.data.data;
      
      setEditName(campaign.name);
      setEditLocation(campaign.location || '');
      setEditMaxSelectable(campaign.max_selectable_dates);
      setEditStartDate(campaign.start_date);
      setEditEndDate(campaign.end_date);
      
      // Format deadline for datetime-local input
      const dl = new Date(campaign.deadline);
      const formattedDl = dl.toISOString().slice(0, 16);
      setDeadlineFormatted(formattedDl);

      setEditDates(campaign.dates.map(d => ({ date: d.date, max_capacity: d.max_capacity, location: d.location || '' })));
      setShowEditModal(true);
    } catch (err) {
      setError('Failed to load campaign edit parameters.');
    }
  };

  const setDeadlineFormatted = (val) => {
    setEditDeadline(val);
  };

  const handleAddEditDate = () => {
    setEditDates([...editDates, { date: '', max_capacity: 20, location: '' }]);
  };

  const handleRemoveEditDate = (idx) => {
    setEditDates(editDates.filter((_, i) => i !== idx));
  };

  const handleEditDateChange = (idx, field, val) => {
    const updated = [...editDates];
    updated[idx][field] = val;
    setEditDates(updated);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditLoading(true);

    const emptyDates = editDates.some(d => !d.date);
    if (emptyDates) {
      setEditError('Please configure or remove all empty interview date slots.');
      setEditLoading(false);
      return;
    }

    try {
      const payload = {
        name: editName,
        start_date: editStartDate,
        end_date: editEndDate,
        deadline: editDeadline,
        max_selectable_dates: parseInt(editMaxSelectable),
        location: editLocation,
        dates: editDates.map(d => ({ 
          date: d.date, 
          max_capacity: parseInt(d.max_capacity),
          location: d.location || editLocation
        }))
      };

      const res = await api.put(`/api/admin/campaigns/${stats.campaignId}`, payload);
      const overlaps = res.data.data.overlaps || [];

      if (overlaps.length > 0) {
        setOverlapsList(overlaps);
        setShowOverlapModal(true);
        setEditLoading(false);
      } else {
        setShowEditModal(false);
        setSuccess('Hiring Campaign updated successfully!');
        fetchDashboardData(selectedCampaignId);
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update campaign details.');
      setEditLoading(false);
    }
  };

  const handleAcknowledgeAndProceed = async () => {
    setShowOverlapModal(false);
    setShowEditModal(false);
    setSuccess('Hiring Campaign updated and conflicts acknowledged!');
    fetchDashboardData(selectedCampaignId);
  };

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="animate-fade">
      {/* Welcome Card Section */}
      <div className="welcome-card">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Welcome Back, HR Admin</h1>
          <p style={{ marginTop: '4px' }}>
            Current Campaign: <strong style={{ color: 'var(--primary)' }}>{stats.campaignName}</strong>. 
            Manage collection drives, configure locations, and control availability forms.
          </p>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--primary)',
          color: '#ffffff',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          boxShadow: 'var(--shadow)'
        }}>
          <Sparkles size={28} />
        </div>
      </div>

      {/* Dynamic Campaign Selector Bar */}
      {campaigns.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', background: '#F8FAFC', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>Select Active Recruitment Campaign:</span>
            <select
              value={selectedCampaignId || ''}
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
            Total Drives Configured: <strong>{campaigns.length} campaigns</strong>
          </p>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Campaign Control Widget Card */}
      {stats.campaignId && (
        <div className="card" style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', padding: '20px 24px', background: 'linear-gradient(135deg, #ffffff, #F8FAFC)', borderLeft: `4px solid ${stats.campaignStatus === 'active' ? 'var(--primary)' : 'var(--text-secondary)'}` }}>
          
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <CalendarRange size={24} style={{ color: 'var(--primary)' }} />
            <div>
              <h4 style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {stats.campaignName} 
                <span className={`badge ${stats.campaignStatus === 'active' ? 'badge-low' : 'badge-high'}`} style={{ textTransform: 'uppercase', padding: '2px 8px', fontSize: '0.65rem' }}>
                  {stats.campaignStatus === 'active' ? 'Collecting Responses' : 'Submissions Closed'}
                </span>
              </h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>📍 Place: <strong>{stats.campaignLocation || 'Office HQ'}</strong></span>
                <span>⏱️ Limit: <strong>{stats.maxSelectableDates || stats.maxSelectableDates === undefined ? '3' : stats.maxSelectableDates} dates</strong></span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleOpenEdit}
              className="btn btn-secondary btn-sm"
              style={{ height: '38px', fontSize: '0.8rem' }}
            >
              <Edit2 size={14} /> Modify Details
            </button>

            <button
              onClick={handleToggleStatus}
              className={`btn btn-sm ${stats.campaignStatus === 'active' ? 'btn-danger' : 'btn-primary'}`}
              style={{ height: '38px', fontSize: '0.8rem', border: 'none' }}
            >
              {stats.campaignStatus === 'active' ? (
                <>
                  <Lock size={14} /> Close Collection
                </>
              ) : (
                <>
                  <Unlock size={14} /> Open Submissions
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Cards Section */}
      <div className="stats-grid">
        
        {/* Total Interviewers Card */}
        <div 
          className="card stat-card" 
          onClick={() => navigate(`/admin/manage-interviewers?campaign=${stats.campaignId || 'all'}`)}
          style={{ cursor: 'pointer', transition: 'transform 0.2s', ':hover': { transform: 'translateY(-2px)' } }}
        >
          <div className="stat-info">
            <span className="stat-title">Total Interviewers</span>
            <span className="stat-value">{stats.totalInterviewers}</span>
            <span className="stat-trend up">
              Active Pool
            </span>
          </div>
          <div className="stat-icon-container" style={{ backgroundColor: '#EFF6FF', color: 'var(--primary)' }}>
            <Users size={24} />
          </div>
        </div>

        {/* Responses Received Card */}
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title">Responses Received</span>
            <span className="stat-value">{stats.totalResponses}</span>
            <span className="stat-trend up" style={{ color: 'var(--success)' }}>
              Declared Availability
            </span>
          </div>
          <div className="stat-icon-container" style={{ backgroundColor: '#ECFDF5', color: 'var(--success)' }}>
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Pending Responses Card */}
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title">Pending Responses</span>
            <span className="stat-value">{stats.pendingResponses}</span>
            <span className="stat-trend down" style={{ color: 'var(--warning)' }}>
              Awaiting Action
            </span>
          </div>
          <div className="stat-icon-container" style={{ backgroundColor: '#FFFBEB', color: 'var(--warning)' }}>
            <HelpCircle size={24} />
          </div>
        </div>

        {/* Response Percentage Card */}
        <div className="card stat-card">
          <div className="stat-info">
            <span className="stat-title">Response Rate</span>
            <span className="stat-value">{stats.responsePercentage}%</span>
            <span className="stat-trend up" style={{ color: stats.responsePercentage >= 70 ? 'var(--success)' : 'var(--danger)' }}>
              {stats.responsePercentage >= 70 ? 'Target met' : 'Needs attention'}
            </span>
          </div>
          <div className="stat-icon-container" style={{ backgroundColor: '#EEF2F6', color: 'var(--secondary)' }}>
            <Percent size={24} />
          </div>
        </div>

      </div>

      {/* Visual Chart Analytics Section */}
      <div className="charts-grid">
        
        {/* Response Overview Ring Chart Emulator */}
        <div className="card chart-container">
          <div className="chart-header">
            <h3>Response Overview Participation</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Status Metrics</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', height: '220px', gap: '32px' }}>
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              background: `conic-gradient(var(--primary) ${stats.responsePercentage}%, var(--border) ${stats.responsePercentage}% 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
              }}>
                <span style={{ fontSize: '1.5rem', fontWeight: '700' }}>{stats.responsePercentage}%</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Participation</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--primary)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Responded</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{stats.totalResponses} staff members</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '4px', backgroundColor: 'var(--border)' }}></div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Pending Submissions</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{stats.pendingResponses} staff members</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Date Capacity Selection Distribution Bar Chart */}
        <div className="card chart-container">
          <div className="chart-header">
            <h3>Date Capacity Selection Distributions</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Max capacity vs actual</span>
          </div>

          <div className="chart-bars-list">
            {charts.dateDistribution && charts.dateDistribution.length > 0 ? (
              charts.dateDistribution.map((d) => {
                const percent = d.capacity > 0 ? Math.round((d.selections / d.capacity) * 100) : 0;
                return (
                  <div key={d.date} className="chart-bar-item">
                    <div className="bar-label-container">
                      <span>{d.date}</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        <strong>{d.selections}</strong> / {d.capacity} selected ({percent}%)
                      </span>
                    </div>
                    <div className="bar-track">
                      <div 
                        className="bar-fill bar-capacity-fill" 
                        style={{ width: `${Math.min(100, percent)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '180px',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem'
              }}>
                <CalendarRange size={32} style={{ marginBottom: '8px', opacity: 0.6 }} />
                No active dates configured. Create a campaign first.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* EDIT CAMPAIGN MODAL DIALOG OVERLAY */}
      {showEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 998,
          padding: '24px'
        }} className="animate-fade">
          <div className="card" style={{ maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} style={{ color: 'var(--primary)' }} /> Edit Campaign Details
            </h3>

            {editError && <div className="alert alert-danger">{editError}</div>}

            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Campaign Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Interview Location (Place)</label>
                  <input
                    type="text"
                    required
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Max Date Selections</label>
                  <input
                    type="number"
                    required
                    value={editMaxSelectable}
                    onChange={(e) => setEditMaxSelectable(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input
                    type="date"
                    required
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Submission Deadline</label>
                <input
                  type="datetime-local"
                  required
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* Configure dates slots edit */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', marginTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>Active Date Slots</span>
                  
                  <button
                    type="button"
                    onClick={handleAddEditDate}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '30px', borderStyle: 'dashed' }}
                  >
                    <Plus size={12} /> Add Date Row
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {editDates.map((ed, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <div className="form-group" style={{ flex: 1.5, marginBottom: 0 }}>
                        <input
                          type="date"
                          required
                          value={ed.date}
                          onChange={(e) => handleEditDateChange(idx, 'date', e.target.value)}
                          className="form-input"
                          style={{ height: '38px', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                        <input
                          type="number"
                          required
                          min={1}
                          value={ed.max_capacity}
                          onChange={(e) => handleEditDateChange(idx, 'max_capacity', e.target.value)}
                          className="form-input"
                          style={{ height: '38px', fontSize: '0.85rem' }}
                        />
                      </div>

                      <div className="form-group" style={{ flex: 1.5, marginBottom: 0 }}>
                        <input
                          type="text"
                          placeholder="Location (Place)"
                          value={ed.location || ''}
                          onChange={(e) => handleEditDateChange(idx, 'location', e.target.value)}
                          className="form-input"
                          style={{ height: '38px', fontSize: '0.85rem' }}
                        />
                      </div>

                      {editDates.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEditDate(idx)}
                          className="btn btn-secondary btn-danger"
                          style={{ width: '38px', height: '38px', padding: 0, backgroundColor: '#FEE2E2', border: 'none', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-secondary"
                  style={{ height: '40px', fontSize: '0.85rem' }}
                >
                  Cancel
                </button>
                
                <button
                  type="submit"
                  disabled={editLoading}
                  className="btn btn-primary"
                  style={{ height: '40px', fontSize: '0.85rem', border: 'none' }}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OVERLAP WARNING DIALOG OVERLAY (FOR EDIT) */}
      {showOverlapModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '24px'
        }} className="animate-fade">
          <div className="card" style={{ maxWidth: '500px', width: '100%', border: '1px solid rgb(245 158 11 / 0.3)', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--warning)', marginBottom: '16px' }}>
              <AlertTriangle size={32} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Same-Day Campaign Overlap!</h3>
            </div>
            
            <p style={{ fontSize: '0.9rem', marginBottom: '16px' }}>
              We detected that this modified campaign has date slots that conflict with other currently active campaigns. Please review the overlapping dates:
            </p>

            <div style={{ 
              backgroundColor: 'rgb(245 158 11 / 0.05)', 
              border: '1px solid rgb(245 158 11 / 0.2)', 
              borderRadius: '8px', 
              padding: '16px', 
              fontSize: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '160px',
              overflowY: 'auto',
              marginBottom: '24px'
            }}>
              {overlapsList.map((ov, idx) => (
                <div key={idx} style={{ color: '#B45309', fontWeight: '500' }}>
                  ⚠️ {ov}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowOverlapModal(false)}
                className="btn btn-secondary"
                style={{ height: '40px', fontSize: '0.85rem' }}
              >
                Go Back & Adjust Dates
              </button>
              
              <button
                onClick={handleAcknowledgeAndProceed}
                className="btn btn-primary"
                style={{ height: '40px', fontSize: '0.85rem', backgroundColor: 'var(--warning)', border: 'none' }}
              >
                <CheckCircle2 size={16} /> Acknowledge and Proceed
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
