import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { FileSpreadsheet, Download, RefreshCw, AlertCircle, Users, CalendarRange, MapPin, Monitor } from 'lucide-react';

export default () => {
  const [campaign, setCampaign] = useState(null);
  const [activeTab, setActiveTab] = useState('availability'); // 'availability', 'summary'
  
  // Data Matrices
  const [availabilityReport, setAvailabilityReport] = useState([]);
  const [summaryReport, setSummaryReport] = useState([]);

  // Multiple Campaigns state
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = async (campaignId = null) => {
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
        const campaignDetails = allCampaigns.find(c => c.id === parseInt(targetId)) || allCampaigns[0];
        setCampaign(campaignDetails);

        // Fetch availability list
        const availRes = await api.get(`/api/reports/availability?campaignId=${targetId}`);
        setAvailabilityReport(availRes.data.data);

        // Fetch date summary list
        const summaryRes = await api.get(`/api/reports/summary?campaignId=${targetId}`);
        setSummaryReport(summaryRes.data.data);
      } else {
        setCampaign(null);
        setAvailabilityReport([]);
        setSummaryReport([]);
      }

      setLoading(false);
    } catch (err) {
      setError('Failed to fetch operational report sheets.');
      setLoading(false);
    }
  };

  const handleCampaignChange = (campaignId) => {
    setSelectedCampaignId(campaignId);
    fetchReports(campaignId);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleExport = (format) => {
    if (!campaign) return;
    
    // Construct direct export API download URL path prefixing backend server address
    const baseURL = api.defaults.baseURL || 'http://localhost:5000';
    const url = `${baseURL}/api/reports/export?reportType=${activeTab}&format=${format}&campaignId=${campaign.id}`;
    
    // Create virtual temporary element to trigger immediate native download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeTab}_report_${campaign.id}.${format === 'csv' ? 'csv' : 'xls'}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        <h3>No Reports Available</h3>
        <p style={{ marginTop: '8px' }}>Create an availability campaign and collect responses to view report matrices.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade" style={{ paddingBottom: '40px' }}>
      
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FileSpreadsheet size={32} style={{ color: 'var(--primary)' }} />
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Analytics & Reports</h2>
            <p>Active Campaign: <strong style={{ color: 'var(--primary)' }}>{campaign.name}</strong></p>
          </div>
        </div>

        <button onClick={() => fetchReports(selectedCampaignId)} className="btn btn-secondary" style={{ height: '40px' }}>
          <RefreshCw size={16} /> Refresh Reports
        </button>
      </div>

      {/* Dynamic Campaign Selector Bar for Reports */}
      {campaigns.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>Select Campaign Report:</span>
            <select
              value={selectedCampaignId || ''}
              onChange={(e) => handleCampaignChange(e.target.value)}
              className="form-input"
              style={{ width: '280px', height: '40px', fontSize: '0.85rem', padding: '0 12px', marginBottom: 0 }}
            >
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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

      {/* Tabs Selector Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('availability')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            color: activeTab === 'availability' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'availability' ? '3px solid var(--primary)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Users size={16} /> Availability Matrix Report
        </button>
        
        <button
          onClick={() => setActiveTab('summary')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: 'none',
            fontSize: '0.95rem',
            fontWeight: '600',
            cursor: 'pointer',
            color: activeTab === 'summary' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeTab === 'summary' ? '3px solid var(--primary)' : '3px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CalendarRange size={16} /> Date Selection Summary
        </button>
      </div>

      {/* Export Toolbar actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '20px' }}>
        <button
          onClick={() => handleExport('csv')}
          className="btn btn-secondary btn-sm"
          style={{ height: '38px', borderColor: 'var(--primary)', color: 'var(--primary)', fontWeight: '600' }}
        >
          <Download size={14} /> Export to CSV
        </button>
        <button
          onClick={() => handleExport('excel')}
          className="btn btn-primary btn-sm"
          style={{ height: '38px', backgroundColor: 'var(--secondary)', border: 'none' }}
        >
          <Download size={14} /> Export to Excel
        </button>
      </div>

      {/* Conditional Render Matrix tables */}
      <div className="card table-card animate-fade">
        {activeTab === 'availability' ? (
          <div>
            <div className="table-header-bar">
              <h3>Interviewer Allocation Matrix</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Comprehensive overview of interviewer selections</span>
            </div>
            
            <div className="table-wrapper">
              <table>
                <thead>
                    <tr>
                      <th>Interviewer Name</th>
                      <th>Phone</th>
                      <th>Total Slots</th>
                      <th>Slot 1</th>
                      <th>Slot 1 Location</th>
                      <th>Slot 2</th>
                      <th>Slot 2 Location</th>
                      <th>Slot 3</th>
                      <th>Slot 3 Location</th>
                      <th>Comments</th>
                      <th>Submitted At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availabilityReport.length > 0 ? (
                      availabilityReport.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: '600' }}>{row.name}</td>
                          <td style={{ fontSize: '0.85rem' }}>{row.phone_number}</td>
                          <td style={{ fontWeight: '700', color: 'var(--primary)', textAlign: 'center' }}>
                          <span style={{ backgroundColor: 'rgb(37 99 235 / 0.1)', padding: '4px 10px', borderRadius: '50px' }}>{row.total_slots}</span>
                        </td>
                        
                        <td style={{ fontWeight: '700', fontSize: '0.85rem' }}>{row.slot1}</td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {row.slot1_location !== '-' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: row.slot1_location === 'Online' ? 'var(--primary)' : 'var(--success)' }}>
                              {row.slot1_location === 'Online' ? <Monitor size={12} /> : <MapPin size={12} />}
                              {row.slot1_location}
                            </span>
                          )}
                          {row.slot1_location === '-' && '-'}
                        </td>
                        
                        <td style={{ fontWeight: '700', fontSize: '0.85rem' }}>{row.slot2}</td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {row.slot2_location !== '-' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: row.slot2_location === 'Online' ? 'var(--primary)' : 'var(--success)' }}>
                              {row.slot2_location === 'Online' ? <Monitor size={12} /> : <MapPin size={12} />}
                              {row.slot2_location}
                            </span>
                          )}
                          {row.slot2_location === '-' && '-'}
                        </td>
                        
                        <td style={{ fontWeight: '700', fontSize: '0.85rem' }}>{row.slot3}</td>
                        <td style={{ fontSize: '0.8rem' }}>
                          {row.slot3_location !== '-' && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: row.slot3_location === 'Online' ? 'var(--primary)' : 'var(--success)' }}>
                              {row.slot3_location === 'Online' ? <Monitor size={12} /> : <MapPin size={12} />}
                              {row.slot3_location}
                            </span>
                          )}
                          {row.slot3_location === '-' && '-'}
                        </td>
                        
                        <td style={{ fontSize: '0.8rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={row.comments}>
                          {row.comments ? row.comments : <span style={{ color: 'var(--text-secondary)' }}>No comments</span>}
                        </td>
                        <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                          {row.submitted_at && row.submitted_at !== '-' ? new Date(row.submitted_at).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                        No interviewer selection logs logged for this campaign yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div>
            <div className="table-header-bar">
              <h3>Daily Interview Capacity</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Daily participant totals</span>
            </div>
            
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '200px' }}>Interview Date</th>
                    <th style={{ width: '150px' }}>Available Interviewers</th>
                    <th>Participants List</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryReport.length > 0 ? (
                    summaryReport.map((row) => (
                      <tr key={row.date}>
                        <td style={{ fontWeight: '700', color: 'var(--primary)' }}>{row.date}</td>
                        <td>
                          <span style={{ 
                            backgroundColor: row.count > 0 ? 'rgb(34 197 94 / 0.08)' : 'rgb(239 68 68 / 0.08)',
                            color: row.count > 0 ? 'var(--success)' : 'var(--danger)',
                            padding: '4px 12px',
                            borderRadius: '50px',
                            fontWeight: '700',
                            fontSize: '0.85rem'
                          }}>
                            {row.count} available
                          </span>
                        </td>
                        <td style={{ fontWeight: '500', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{row.interviewers}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                        No date allocations configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
