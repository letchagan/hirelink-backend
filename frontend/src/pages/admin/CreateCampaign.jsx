import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { CalendarPlus, Plus, Trash2, CalendarRange, Clock, AlertTriangle, MapPin, CheckCircle } from 'lucide-react';

export default () => {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [maxSelectableDates, setMaxSelectableDates] = useState(3);
  const [location, setLocation] = useState('');
  
  // Custom date slots allocation array
  const [dates, setDates] = useState([
    { date: '', max_capacity: 20, location: '' }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [overlapsList, setOverlapsList] = useState([]);
  const [showOverlapModal, setShowOverlapModal] = useState(false);

  // Add date option row
  const addDateRow = () => {
    setDates([...dates, { date: '', max_capacity: 20, location: '' }]);
  };

  // Remove date option row
  const removeDateRow = (index) => {
    const updated = dates.filter((_, idx) => idx !== index);
    setDates(updated);
  };

  // Edit fields on specific row
  const handleDateChange = (index, field, value) => {
    const updated = [...dates];
    updated[index][field] = value;
    setDates(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setOverlapsList([]);
    setLoading(true);

    // Basic date validations
    const emptyDates = dates.some(d => !d.date);
    if (emptyDates) {
      setError('Please fill in or remove all empty interview date configurations.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name,
        start_date: startDate,
        end_date: endDate,
        deadline,
        max_selectable_dates: parseInt(maxSelectableDates),
        location,
        dates: dates.map(d => ({ 
          date: d.date, 
          max_capacity: parseInt(d.max_capacity),
          location: d.location || location 
        }))
      };

      const res = await api.post('/api/admin/campaigns', payload);
      const overlaps = res.data.data.overlaps || [];

      if (overlaps.length > 0) {
        // Date overlap conflict found
        setOverlapsList(overlaps);
        setShowOverlapModal(true);
        setLoading(false);
      } else {
        setSuccess('Hiring Campaign registered successfully! Redirecting...');
        setTimeout(() => {
          navigate('/admin');
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register Availability Campaign.');
      setLoading(false);
    }
  };

  const handleAcknowledgeAndProceed = () => {
    setShowOverlapModal(false);
    setSuccess('Hiring Campaign saved with overlaps acknowledged! Redirecting...');
    setTimeout(() => {
      navigate('/admin');
    }, 1500);
  };

  return (
    <div className="animate-fade" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <CalendarPlus size={32} style={{ color: 'var(--primary)' }} />
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Create Availability Campaign</h2>
          <p>Configure automated scheduling collections and limits for recruitment operations</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Campaign Name */}
          <div className="form-group">
            <label className="form-label">Campaign Title / Name</label>
            <input
              type="text"
              required
              placeholder="e.g. July Hiring Drive 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-row">
            {/* Campaign Default Location Place */}
            <div className="form-group">
              <label className="form-label">Default Interview Location (Place)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hyderabad, Pune, Chennai"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: '44px' }}
                />
                <MapPin size={18} style={{ 
                  position: 'absolute', 
                  left: '16px', 
                  top: '15px', 
                  color: 'var(--text-secondary)' 
                }} />
              </div>
            </div>

            {/* Selection Limits */}
            <div className="form-group">
              <label className="form-label">Max Date Slots an Interviewer can Select</label>
              <input
                type="number"
                required
                min={1}
                max={10}
                value={maxSelectableDates}
                onChange={(e) => setMaxSelectableDates(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Start and End date limits */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Campaign Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Campaign End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Submission Deadline */}
          <div className="form-group">
            <label className="form-label">Availability Submission Deadline</label>
            <input
              type="datetime-local"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="form-input"
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />

          {/* Add Interview Dates Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                  <CalendarRange size={18} style={{ color: 'var(--primary)' }} /> Configure Interview Date Slots
                </h4>
                <p style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                  Define which dates are open for interview slots and how many interviewers you need per day.
                </p>
              </div>

              <button
                type="button"
                onClick={addDateRow}
                className="btn btn-secondary btn-sm"
                style={{ borderStyle: 'dashed' }}
              >
                <Plus size={16} /> Add Date Slot
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {dates.map((d, index) => (
                <div 
                  key={index} 
                  style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    alignItems: 'center',
                    padding: '16px',
                    backgroundColor: 'var(--bg)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    flexWrap: 'wrap'
                  }}
                  className="animate-fade"
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', minWidth: '24px' }}>
                    #{index + 1}
                  </span>

                  <div className="form-group" style={{ flex: 1.5, marginBottom: 0, minWidth: '150px' }}>
                    <label className="form-label">Interview Date</label>
                    <input
                      type="date"
                      required
                      value={d.date}
                      onChange={(e) => handleDateChange(index, 'date', e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1, marginBottom: 0, minWidth: '120px' }}>
                    <label className="form-label">Max Capacity</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={d.max_capacity}
                      onChange={(e) => handleDateChange(index, 'max_capacity', e.target.value)}
                      className="form-input"
                    />
                  </div>

                  <div className="form-group" style={{ flex: 1.5, marginBottom: 0, minWidth: '150px' }}>
                    <label className="form-label">Date Location (Place)</label>
                    <input
                      type="text"
                      placeholder="e.g. Hyderabad, Chennai"
                      value={d.location}
                      onChange={(e) => handleDateChange(index, 'location', e.target.value)}
                      className="form-input"
                    />
                  </div>

                  {dates.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDateRow(index)}
                      className="btn btn-secondary btn-danger"
                      style={{ 
                        width: '42px', 
                        height: '42px', 
                        padding: 0, 
                        marginTop: '22px',
                        backgroundColor: '#FEE2E2',
                        border: 'none',
                        color: 'var(--danger)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Remove Row"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '12px 0' }} />

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ border: 'none' }}
            >
              {loading ? 'Creating...' : 'Register Hiring Campaign'}
            </button>
          </div>

        </form>
      </div>

      {/* OVERLAP WARNING DIALOG OVERLAY */}
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
              We detected that this campaign has date slots that conflict with other currently active campaigns. Please review the overlapping dates:
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
                <CheckCircle size={16} /> Acknowledge and Proceed
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
