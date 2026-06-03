import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Mail, Search, Eye, Clock } from 'lucide-react';

export default () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/admin/mail-logs');
      setLogs(res.data.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load email notification logs.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(l => 
    l.to_email.toLowerCase().includes(search.toLowerCase()) ||
    l.subject.toLowerCase().includes(search.toLowerCase()) ||
    l.body.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="animate-fade">
      <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Mail size={32} style={{ color: 'var(--primary)' }} />
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Communication Audit Logs</h2>
            <p>Monitor automated reminders and system communication history.</p>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px', alignItems: 'start' }}>
        
        {/* Table list */}
        <div className="card table-card">
          <div className="table-header-bar">
            <h3 style={{ fontSize: '1.1rem' }}>Dispatch History ({filteredLogs.length})</h3>
            
            <div style={{ position: 'relative', width: '250px' }}>
              <input
                type="text"
                placeholder="Search logs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ height: '38px', paddingLeft: '36px', fontSize: '0.85rem' }}
              />
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '11px', color: 'var(--text-secondary)' }} />
            </div>
          </div>

          {loading ? (
            <div className="loader-container"><div className="spinner"></div></div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No email logs found.
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Recipient (To)</th>
                    <th>Subject</th>
                    <th>Date Sent</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(l => (
                    <tr 
                      key={l.id} 
                      onClick={() => setSelectedLog(l)}
                      style={{ cursor: 'pointer', backgroundColor: selectedLog?.id === l.id ? 'rgb(37 99 235 / 0.04)' : '' }}
                    >
                      <td>
                        <strong style={{ fontSize: '0.85rem' }}>{l.to_email}</strong>
                      </td>
                      <td style={{ fontSize: '0.85rem', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.subject}
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {new Date(l.created_at).toLocaleString()}
                        </div>
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-secondary" 
                          style={{ height: '30px', padding: '0 10px', fontSize: '0.75rem' }}
                          onClick={(e) => { e.stopPropagation(); setSelectedLog(l); }}
                        >
                          <Eye size={12} /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected preview panel */}
        <div className="card" style={{ position: 'sticky', top: '90px', padding: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={18} style={{ color: 'var(--primary)' }} /> Selected Email Preview
          </h3>

          {selectedLog ? (
            <div className="email-preview-container" style={{ border: '1px solid var(--border)', borderRadius: '8px' }}>
              <div className="email-preview-header" style={{ backgroundColor: 'var(--bg)', padding: '16px', fontSize: '0.8rem', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div><strong>From:</strong> {selectedLog.from_email}</div>
                <div><strong>To:</strong> {selectedLog.to_email}</div>
                <div><strong>Subject:</strong> <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{selectedLog.subject}</span></div>
                <div><strong>Date:</strong> {new Date(selectedLog.created_at).toLocaleString()}</div>
              </div>
              <div className="email-preview-body" style={{ padding: '20px', fontSize: '0.85rem', whiteSpace: 'pre-line', minHeight: '200px', maxHeight: '350px', overflowY: 'auto' }}>
                {selectedLog.body}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
              <Mail size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              Select an email log from the list to preview its generated contents here.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
