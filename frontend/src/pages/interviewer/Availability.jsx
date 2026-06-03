import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { Clock, Check, Calendar, AlertCircle, Save, Monitor, MapPin, MessageSquare, Mail } from 'lucide-react';

export default () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [campaign, setCampaign] = useState(null);

  // Multiple Campaigns state
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);

  // Selected slots: array of { dateId, slotType }
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [comments, setComments] = useState('');

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submissionReceipt, setSubmissionReceipt] = useState(null);

  const fetchCampaignAndPreferences = async (campaignId = null) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setSelectedSlots([]);
      setComments('');

      // Fetch all active campaigns
      const campaignsRes = await api.get('/api/interviewer/active-campaigns');
      const allActiveCampaigns = campaignsRes.data.data || [];
      setCampaigns(allActiveCampaigns);

      let targetCampaignId = campaignId;
      if (!targetCampaignId && allActiveCampaigns.length > 0) {
        targetCampaignId = allActiveCampaigns[0].id;
      }
      setSelectedCampaignId(targetCampaignId);

      if (targetCampaignId) {
        // Fetch specific active campaign details
        const campaignRes = await api.get(`/api/interviewer/active-campaign?campaignId=${targetCampaignId}`);
        const active = campaignRes.data.data;
        setCampaign(active);

        // Fetch existing selections for this campaign using user email
        if (user && user.email) {
          try {
            const selectionsRes = await api.post('/api/interviewer/load-existing', {
              email: user.email,
              campaignId: targetCampaignId
            });
            const { selections, comments: existingComments, submitted_at } = selectionsRes.data.data;

            if (selections && selections.length > 0) {
              setSelectedSlots(selections);
              setIsLocked(true);

              // Generate receipt for already submitted response
              const receiptSlots = selections.map(slot => {
                const dObj = active.dates.find(d => Number(d.id) === Number(slot.dateId));
                return {
                  date: dObj ? dObj.date : 'Unknown Date',
                  location: slot.slotType === 'online' ? 'Online (Virtual)' : (dObj ? (dObj.location || 'HQ Office') : 'HQ Office'),
                  medium: slot.slotType
                };
              });
              setSubmissionReceipt({
                interviewerName: user.name,
                interviewerPhone: user.phone_number || '',
                campaignName: active.name,
                slots: receiptSlots,
                comments: existingComments || '',
                submittedAt: submitted_at ? new Date(submitted_at).toLocaleString() : 'Not recorded'
              });
            } else {
              setIsLocked(false);
              setSubmissionReceipt(null);
            }
            if (existingComments) {
              setComments(existingComments);
            }
          } catch (e) {
            // Profile might be fresh, ignore
          }
        }
      } else {
        setCampaign(null);
      }

      setLoading(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setCampaign(null);
      } else {
        setError('Failed to fetch availability campaign configurations.');
      }
      setLoading(false);
    }
  };

  const handleCampaignChange = (campaignId) => {
    setSelectedCampaignId(campaignId);
    fetchCampaignAndPreferences(campaignId);
  };

  useEffect(() => {
    fetchCampaignAndPreferences();
  }, [user]);

  const handleCardToggle = (id) => {
    setError('');
    setSuccess('');

    const existingIndex = selectedSlots.findIndex(s => s.dateId === id);
    const dateObj = campaign.dates.find(d => d.id === id);

    // Rule 2: Cannot select fully booked dates
    if (existingIndex === -1 && dateObj.remainingSlots === 0) {
      setError(`Selection blocked. Date ${dateObj.date} is fully booked.`);
      return;
    }

    if (existingIndex !== -1) {
      // Remove selection
      setSelectedSlots(selectedSlots.filter(s => s.dateId !== id));
    } else {
      // Rule 1: Cannot exceed maximum selectable dates limit
      if (selectedSlots.length >= campaign.max_selectable_dates) {
        setError(`Selection blocked. You cannot select more than ${campaign.max_selectable_dates} dates.`);
        return;
      }
      // Add selection, default to 'offline'
      setSelectedSlots([...selectedSlots, { dateId: id, slotType: 'offline' }]);
    }
  };

  const handleSlotTypeChange = (id, type, e) => {
    e.stopPropagation(); // Avoid card toggle
    setSelectedSlots(selectedSlots.map(s => {
      if (s.dateId === id) {
        return { ...s, slotType: type };
      }
      return s;
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const minSlots = campaign.min_selectable_dates || 1;

    if (selectedSlots.length === 0) {
      alert("It is compulsory to fill your availability. Please select at least one date.");
      setError("It is compulsory to fill your availability. Please select at least one date.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (selectedSlots.length < minSlots) {
      alert(`Please choose the minimum data. You must select at least ${minSlots} date(s) before it can be submitted.`);
      setError(`Please choose the minimum data. You must select at least ${minSlots} date(s) before it can be submitted.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaveLoading(true);

    try {
      await api.post('/api/interviewer/submit', {
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        campaignId: campaign.id,
        selectedSlots: selectedSlots,
        comments: comments
      });

      setSuccess('Your interview availability dates and choices have been saved successfully!');
      setIsLocked(true);

      // Refresh campaign stats
      const campaignRes = await api.get(`/api/interviewer/active-campaign?campaignId=${campaign.id}`);
      const refreshedCampaign = campaignRes.data.data;
      setCampaign(refreshedCampaign);

      // Save slots information for receipt preview
      const receiptSlots = selectedSlots.map(slot => {
        const dObj = refreshedCampaign.dates.find(d => Number(d.id) === Number(slot.dateId));
        return {
          date: dObj ? dObj.date : 'Unknown Date',
          location: slot.slotType === 'online' ? 'Online (Virtual)' : (dObj ? (dObj.location || 'HQ Office') : 'HQ Office'),
          medium: slot.slotType
        };
      });
      setSubmissionReceipt({
        interviewerName: user.name,
        interviewerPhone: user.phone_number,
        campaignName: campaign.name,
        slots: receiptSlots,
        comments: comments,
        submittedAt: new Date().toLocaleString()
      });

      setSaveLoading(false);

      // Redirect to interviewer dashboard after brief delay
      setTimeout(() => {
        navigate('/interviewer');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit availability selections.');
      setSaveLoading(false);
    }
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
        <h3>No Campaigns Available</h3>
        <p style={{ marginTop: '8px' }}>There are no active availability collection drives running at this time.</p>
      </div>
    );
  }

  const deadlinePassed = new Date(campaign.deadline) < new Date() || campaign.status === 'closed';
  const isFormDisabled = deadlinePassed || isLocked;

  return (
    <div className="animate-fade" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>

      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Calendar size={32} style={{ color: 'var(--primary)' }} />
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Submit Interview Availability</h2>
            <p style={{ fontSize: '0.85rem' }}>Campaign: <strong style={{ color: 'var(--primary)' }}>{campaign.name}</strong></p>
          </div>
        </div>

      </div>

      {/* Dynamic Campaign Selector Bar for Interviewers */}
      {campaigns.length > 0 && (
        <div className="card" style={{ marginBottom: '24px', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>Select Recruitment Drive Campaign:</span>
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
      )}

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Submission Receipt Box Emulator */}
      {submissionReceipt && (
        <div className="card animate-fade" style={{
          marginBottom: '32px',
          border: '1px solid var(--primary)',
          background: 'var(--bg)',
          padding: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: '1px solid var(--border)',
            paddingBottom: '12px',
            marginBottom: '16px'
          }}>
            <Check size={20} style={{ color: 'var(--primary)' }} />
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>📄 Interview Availability Submission Receipt</h4>
          </div>

          <p style={{ fontSize: '0.85rem', marginBottom: '16px', color: 'var(--text-secondary)' }}>
            Your availability details have been securely recorded and submitted to the HR Recruiting Team.
          </p>

          <div style={{
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '16px',
            fontSize: '0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ color: 'var(--text-secondary)' }}>
              <strong>Interviewer:</strong> {submissionReceipt.interviewerName}<br />
              <strong>HR Coordinator Contact:</strong> Kaviarasu<br />
              <strong>Timestamp:</strong> {submissionReceipt.submittedAt}
            </div>

            <hr style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '4px 0' }} />

            <div>
              <strong>Recruitment Campaign:</strong> <strong style={{ color: 'var(--primary)' }}>{submissionReceipt.campaignName}</strong>
            </div>

            <div>
              <strong>Declared Available Slots:</strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                {submissionReceipt.slots.map((s, idx) => (
                  <div key={idx} style={{ padding: '8px 12px', backgroundColor: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700' }}>{s.date}</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '2px 8px', borderRadius: '50px', backgroundColor: s.medium === 'online' ? 'rgb(37 99 235 / 0.08)' : 'rgb(34 197 94 / 0.08)', color: s.medium === 'online' ? 'var(--primary)' : 'var(--success)' }}>
                      📍 {s.location}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <strong>Interviewer Comments:</strong>
              <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)', fontStyle: submissionReceipt.comments ? 'normal' : 'italic', marginTop: '4px', color: 'var(--text-secondary)' }}>
                {submissionReceipt.comments || 'No comments provided.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {deadlinePassed && !isLocked && (
        <div className="alert alert-danger" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Clock size={20} />
          <strong>Submission Closed:</strong> This campaign is closed. Edits are locked.
        </div>
      )}
      {isLocked && (
        <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Check size={20} />
          <strong>Submission Locked:</strong> You have already submitted your availability for this campaign.
        </div>
      )}

      {/* Selector Grid of Cards */}
      <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-primary)' }}>1. Select Available Dates ({selectedSlots.length} selected)</h3>

      <div className="dates-selector-grid" style={{ marginBottom: '32px' }}>
        {campaign.dates.map((d) => {
          const selectedObj = selectedSlots.find(s => s.dateId === d.id);
          const isSelected = !!selectedObj;
          const isFullyBooked = d.remainingSlots === 0;

          return (
            <div
              key={d.id}
              onClick={() => !isFormDisabled && handleCardToggle(d.id)}
              className={`card date-selection-card ${isSelected ? 'selected' : ''} ${isFullyBooked && !isSelected ? 'disabled' : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: '20px',
                pointerEvents: isFormDisabled ? 'none' : 'auto',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: isSelected ? 'var(--primary)' : 'var(--text-primary)' }}>
                    {d.date}
                  </span>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {isFullyBooked ? (
                      <strong style={{ color: 'var(--danger)' }}>Fully Booked</strong>
                    ) : (
                      <span>Remaining Slots: <strong>{d.remainingSlots}</strong></span>
                    )}
                  </span>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    <span>Place: <strong>{d.location || 'HQ Office'}</strong></span>
                  </span>
                </div>

                {/* Checkbox indicator */}
                <div className="card-select-checkbox">
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </div>
              </div>

              {/* Slot type radio selections inside card - shown only when card is selected */}
              {isSelected && (
                <div
                  className="animate-fade"
                  style={{
                    marginTop: '4px',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    INTERVIEW MEDIUM:
                  </span>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}
                    >
                      <input
                        type="radio"
                        name={`medium-${d.id}`}
                        checked={selectedObj.slotType === 'offline'}
                        onChange={(e) => handleSlotTypeChange(d.id, 'offline', e)}
                        disabled={isFormDisabled}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <MapPin size={12} style={{ color: 'var(--text-secondary)' }} /> Offline ({d.location || 'HQ Office'})
                    </label>

                    <label
                      onClick={(e) => e.stopPropagation()}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '500' }}
                    >
                      <input
                        type="radio"
                        name={`medium-${d.id}`}
                        checked={selectedObj.slotType === 'online'}
                        onChange={(e) => handleSlotTypeChange(d.id, 'online', e)}
                        disabled={isFormDisabled}
                        style={{ accentColor: 'var(--primary)' }}
                      />
                      <Monitor size={12} style={{ color: 'var(--text-secondary)' }} /> Online (Virtual)
                    </label>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Slots Policy Indicator */}
      <div className="card" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        backgroundColor: 'var(--bg)',
        border: '1px dashed var(--border)',
        flexWrap: 'wrap',
        gap: '16px',
        padding: '16px 24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={18} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '0.9rem' }}>
            Selected: <strong style={{ color: 'var(--primary)' }}>{selectedSlots.length}</strong> (Min: {campaign.min_selectable_dates || 1}, Max: {campaign.max_selectable_dates})
          </span>
        </div>

        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          Deadline: {new Date(campaign.deadline).toLocaleString()}
        </span>
      </div>

      {/* Comments Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
        <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
          <MessageSquare size={18} style={{ color: 'var(--primary)' }} /> 2. Add Comments / Special Instructions
        </h3>
        <textarea
          placeholder=""
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          disabled={isFormDisabled}
          className="form-input"
          style={{
            minHeight: '120px',
            padding: '12px 16px',
            resize: 'vertical',
            fontFamily: 'inherit',
            fontSize: '0.9rem'
          }}
        />
      </div>

      {/* Save Button */}
      {!isFormDisabled && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
          <button
            onClick={handleSave}
            disabled={saveLoading}
            className="btn btn-primary"
            type="button"
            style={{ height: '48px', border: 'none' }}
          >
            <Save size={16} /> {saveLoading ? 'Submitting selections...' : 'Submit Availability'}
          </button>
        </div>
      )}

      {isFormDisabled && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => {
              // Perform a clean logout
              localStorage.removeItem('hirescheduler_token');
              localStorage.removeItem('hirescheduler_user');
              navigate('/login');
            }}
            className="btn btn-secondary"
            style={{ height: '48px' }}
          >
            Return to Login
          </button>
        </div>
      )}

    </div>
  );
};
