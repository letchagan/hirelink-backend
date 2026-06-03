import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Sparkles, Calendar, Award, CheckCircle2, ChevronRight, User } from 'lucide-react';

export default () => {
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError('');
      
      const res = await api.get('/api/ai/schedule');
      setScheduleData(res.data.data);
      
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to execute AI Scheduling Engine.');
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade">
      
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <Sparkles size={32} style={{ color: 'var(--primary)' }} />
        <div>
          <h2>AI Scheduling Coordinator</h2>
          <p>Generate optimized Balanced Workload interview allocation plans instantly using constraint programming</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Action Button Card */}
      {!scheduleData && !loading && (
        <div className="card" style={{ 
          textAlign: 'center', 
          padding: '48px', 
          background: 'linear-gradient(135deg, rgb(37 99 235 / 0.02), rgb(79 70 229 / 0.02))' 
        }}>
          <Sparkles size={48} style={{ color: 'var(--primary)', marginBottom: '16px', opacity: 0.8 }} />
          <h3>Optimize Interview Allocations</h3>
          <p style={{ marginTop: '8px', maxWidth: '500px', margin: '8px auto 24px' }}>
            The AI engine analyzes interviewer availabilities, daily capacity targets, and interviewer load limits to produce a balanced, overbooking-free distribution plan.
          </p>
          <button onClick={handleGenerate} className="btn btn-primary" style={{ height: '48px' }}>
            Generate Optimal Schedule
          </button>
        </div>
      )}

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '64px' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
          <h3>AI Engine is Processing...</h3>
          <p style={{ marginTop: '4px' }}>Balancing workloads, distributing allocations, and satisfying capacities.</p>
        </div>
      )}

      {/* AI Schedule Report Output */}
      {scheduleData && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }} className="animate-fade">
          
          {/* Re-optimize and metrics bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Plan optimization completed successfully.
            </span>
            <button onClick={handleGenerate} className="btn btn-secondary btn-sm" style={{ height: '38px', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
              Re-optimize Allocations
            </button>
          </div>

          {/* AI Metrics Summary Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
            
            {/* Optimization Score */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid var(--success)' }}>
              <div style={{ 
                backgroundColor: 'rgb(34 197 94 / 0.1)', 
                color: 'var(--success)', 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Award size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Schedule Score</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{scheduleData.score}% Optimized</h3>
              </div>
            </div>

            {/* Workload Balance Indicator */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px', borderLeft: '4px solid var(--primary)' }}>
              <div style={{ 
                backgroundColor: 'rgb(37 99 235 / 0.1)', 
                color: 'var(--primary)', 
                width: '48px', 
                height: '48px', 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Workload Indicator</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{scheduleData.balanced_workload} Balance</h3>
              </div>
            </div>

          </div>

          {/* Visual Daily Timelines */}
          <div className="card">
            <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} /> Recommended Daily Allocation Timelines
            </h3>

            <div className="timeline-list">
              {Object.entries(scheduleData.schedule).map(([date, staffList]) => (
                <div key={date} className="card timeline-card animate-fade" style={{ borderLeftWidth: '4px' }}>
                  <div className="timeline-date-side">
                    <span className="timeline-date-label">{date}</span>
                    <span className="timeline-capacity-label">
                      {staffList.length} staff scheduled
                    </span>
                  </div>

                  <div className="timeline-allocations-side">
                    <ChevronRight size={20} style={{ color: 'var(--text-secondary)', marginRight: '8px' }} />
                    {staffList.length > 0 ? (
                      staffList.map((name, idx) => (
                        <div key={idx} className="alloc-badge">
                          <User size={14} style={{ color: 'var(--primary)' }} />
                          <span>{name}</span>
                        </div>
                      ))
                    ) : (
                      <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: '500' }}>
                        No staff scheduled. Deficit risk.
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Explanation / Reasoning */}
          <div className="card animate-fade" style={{ borderLeft: '4px solid var(--secondary)' }}>
            <h3 style={{ marginBottom: '12px' }}>AI Engine Operational Insights</h3>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              fontSize: '0.85rem', 
              lineHeight: '1.6', 
              color: 'var(--text-secondary)',
              fontFamily: 'inherit'
            }}>
              {scheduleData.explanation}
            </pre>
          </div>

        </div>
      )}

    </div>
  );
};
