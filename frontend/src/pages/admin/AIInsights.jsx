import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { BarChart4, TrendingUp, Sparkles, CheckCircle2, ChevronRight, FileText } from 'lucide-react';

export default () => {
  const [reportData, setReportData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAIInsights = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch AI Executive report summary
      const reportRes = await api.get('/api/ai/report');
      setReportData(reportRes.data.data);

      // Fetch AI Qualitative insights list
      const insightsRes = await api.get('/api/ai/insights');
      setInsights(insightsRes.data.data.insights);

      setLoading(false);
    } catch (err) {
      setError('Failed to fetch AI Insights analytics.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIInsights();
  }, []);

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
        <BarChart4 size={32} style={{ color: 'var(--primary)' }} />
        <div>
          <h2>AI Executive Insights</h2>
          <p>Retrieve dynamic qualitative analysis summaries and KPI allocations from our AI Engine</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Operational optimizations for executive management reviews
        </span>
        <button onClick={fetchAIInsights} className="btn btn-secondary btn-sm" style={{ height: '38px' }}>
          Refresh Insights
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '32px', alignItems: 'flex-start' }}>
        
        {/* Left Side: Campaign Summary Paper */}
        {reportData ? (
          <div className="card" style={{ padding: '32px', borderTop: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <FileText size={20} style={{ color: 'var(--primary)' }} />
              <h3>AI Executive Summary Report</h3>
            </div>
            
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              fontSize: '0.95rem', 
              lineHeight: '1.8', 
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              backgroundColor: 'var(--bg)',
              padding: '24px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)'
            }}>
              {reportData.summary}
            </pre>

            <div style={{ 
              marginTop: '24px', 
              padding: '16px 20px', 
              backgroundColor: 'rgb(37 99 235 / 0.04)', 
              borderRadius: 'var(--radius-sm)',
              borderLeft: '4px solid var(--secondary)'
            }}>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={14} /> Executive Recommendation:
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.5' }}>
                {reportData.recommendation}
              </p>
            </div>
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '48px' }}>
            No campaign summary available.
          </div>
        )}

        {/* Right Side: Insights Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} /> Strategical Bulletins
          </h3>

          {insights.map((item, index) => (
            <div key={index} className="card animate-fade">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: '700', 
                  textTransform: 'uppercase', 
                  color: 'var(--primary)',
                  letterSpacing: '0.05em' 
                }}>
                  {item.category}
                </span>
                
                <span className="badge badge-low" style={{ fontSize: '0.6rem' }}>
                  {item.severity}
                </span>
              </div>
              
              <p style={{ fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                {item.insight}
              </p>
            </div>
          ))}

          {/* Core system tip */}
          <div className="card" style={{ 
            backgroundColor: 'var(--bg)', 
            borderStyle: 'dashed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
              💡 Strategic insights are auto-recomputed by evaluating participant workloads and date selections against operational objectives.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
