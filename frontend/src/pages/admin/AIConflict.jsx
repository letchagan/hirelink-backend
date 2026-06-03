import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2, ChevronRight, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default () => {
  const navigate = useNavigate();

  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runDetection = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await api.get('/api/ai/conflict');
      setConflicts(res.data.data.conflicts);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to execute AI Conflict Analysis.');
      setLoading(false);
    }
  };

  useEffect(() => {
    runDetection();
  }, []);

  const getRiskBadgeClass = (risk) => {
    if (risk.toLowerCase() === 'high') return 'badge-high';
    if (risk.toLowerCase() === 'medium') return 'badge-medium';
    return 'badge-low';
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
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <ShieldAlert size={32} style={{ color: 'var(--primary)' }} />
        <div>
          <h2>AI Conflict Detection Engine</h2>
          <p>Identify staffing risks, capacity deficits, and scheduling vulnerabilities before campaign closure</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Real-time threat assessments mapped
        </span>
        <button onClick={runDetection} className="btn btn-secondary btn-sm" style={{ height: '38px' }}>
          Re-analyze Risks
        </button>
      </div>

      {/* Conflicts List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {conflicts.length > 0 ? (
          conflicts.map((c, index) => {
            const isDeficit = c.type === 'Capacity Shortage';
            const isStatusCheck = c.risk.toLowerCase() === 'low';
            
            return (
              <div 
                key={index} 
                className="card animate-fade"
                style={{ 
                  borderLeft: `5px solid ${c.risk.toLowerCase() === 'high' ? 'var(--danger)' : c.risk.toLowerCase() === 'medium' ? 'var(--warning)' : 'var(--success)'}`,
                  padding: '24px' 
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <div style={{
                      color: c.risk.toLowerCase() === 'high' ? 'var(--danger)' : c.risk.toLowerCase() === 'medium' ? 'var(--warning)' : 'var(--success)',
                      marginTop: '4px'
                    }}>
                      {c.risk.toLowerCase() === 'high' ? (
                        <AlertCircle size={28} />
                      ) : c.risk.toLowerCase() === 'medium' ? (
                        <AlertTriangle size={28} />
                      ) : (
                        <CheckCircle2 size={28} />
                      )}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem' }}>{c.title}</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>
                        Type: {c.type} | Target Date: {c.date}
                      </span>
                    </div>
                  </div>

                  <span className={`badge ${getRiskBadgeClass(c.risk)}`} style={{ padding: '6px 14px' }}>
                    {c.risk} Risk
                  </span>
                </div>

                {/* Specific metrics breakdown */}
                {isDeficit && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '24px', 
                    margin: '18px 0', 
                    padding: '12px 16px', 
                    backgroundColor: 'var(--bg)', 
                    borderRadius: 'var(--radius-sm)',
                    maxWidth: '450px'
                  }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Capacity Required</span>
                      <h4 style={{ fontSize: '1.25rem', marginTop: '2px' }}>{c.capacity} staff</h4>
                    </div>
                    <div style={{ width: '1px', backgroundColor: 'var(--border)' }}></div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Available Interviewers</span>
                      <h4 style={{ fontSize: '1.25rem', marginTop: '2px', color: c.risk.toLowerCase() === 'high' ? 'var(--danger)' : 'var(--warning)' }}>
                        {c.available} staff
                      </h4>
                    </div>
                  </div>
                )}

                {/* Recommendations and Actions */}
                <div style={{ 
                  marginTop: '16px', 
                  padding: '16px', 
                  backgroundColor: '#FFFBEB', 
                  border: '1px solid #FEF3C7', 
                  borderRadius: 'var(--radius-sm)' 
                }}>
                  <strong style={{ fontSize: '0.85rem', color: '#92400E' }}>Recommended Mitigations:</strong>
                  <p style={{ fontSize: '0.85rem', color: '#B45309', marginTop: '4px', lineHeight: '1.5' }}>
                    {c.recommendation}
                  </p>
                </div>

                {/* Quick actions panel */}
                {!isStatusCheck && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                      onClick={() => navigate('/admin/ai-reminders')}
                      className="btn btn-primary btn-sm"
                      style={{ height: '36px', fontSize: '0.75rem' }}
                    >
                      <Mail size={12} /> Dispatch Reminders
                    </button>
                  </div>
                )}

              </div>
            );
          })
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
            <CheckCircle2 size={48} style={{ color: 'var(--success)', marginBottom: '16px' }} />
            <h3>All Systems Clear</h3>
            <p>The AI Engine has not identified any operational risks or staffing deficits.</p>
          </div>
        )}
      </div>

    </div>
  );
};
