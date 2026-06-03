import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { User, Calendar, ArrowRight, CheckCircle, MapPin, Monitor } from 'lucide-react';
import api from '../../api/axios';

export default () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        if (user && user.email) {
          const res = await api.post('/api/interviewer/schedule', { email: user.email });
          setSchedule(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch schedule', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSchedule();
  }, [user]);

  return (
    <div className="animate-fade" style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <User size={32} style={{ color: 'var(--primary)' }} />
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Welcome, {user?.name || 'Interviewer'}!</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>HireLink Interviewer Portal</p>
        </div>
      </div>

      <div className="card" style={{ padding: '32px', textAlign: 'center', backgroundColor: 'var(--bg)', border: '1px solid var(--border)', marginBottom: '32px' }}>
        <Calendar size={48} style={{ color: 'var(--primary)', margin: '0 auto 16px' }} />
        <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Interview Availability Drives</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '500px', margin: '0 auto 24px' }}>
          Your primary portal to declare your availability for upcoming recruitment drives. HR uses this data to automatically schedule candidates without conflicting with your busy schedule.
        </p>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate('/interviewer/availability')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          Manage Availability <ArrowRight size={16} />
        </button>
      </div>

      {/* Render the schedule */}
      <h3 style={{ fontSize: '1.2rem', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <CheckCircle size={20} style={{ color: 'var(--success)' }} /> Your Confirmed Availability
      </h3>

      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading schedule...</div>
      ) : schedule.length > 0 ? (
        <div className="table-container card">
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Campaign</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Medium</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Location</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px', fontWeight: '600' }}>{item.date}</td>
                  <td style={{ padding: '12px' }}>{item.campaignName}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: '50px', 
                      fontSize: '0.75rem', 
                      fontWeight: '600',
                      backgroundColor: item.mode === 'online' ? 'rgb(37 99 235 / 0.1)' : 'rgb(34 197 94 / 0.1)',
                      color: item.mode === 'online' ? 'var(--primary)' : 'var(--success)'
                    }}>
                      {item.mode === 'online' ? <Monitor size={12} style={{ marginRight: '4px', display: 'inline' }}/> : <MapPin size={12} style={{ marginRight: '4px', display: 'inline' }}/>}
                      {item.mode === 'online' ? 'Online' : 'Offline'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{item.mode === 'online' ? 'Virtual Link (TBD)' : (item.defaultLocation || 'HQ Office')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ padding: '24px', textAlign: 'center', border: '1px dashed var(--border)', backgroundColor: 'transparent' }}>
          <p style={{ color: 'var(--text-secondary)' }}>You have not submitted availability for any active campaigns yet.</p>
        </div>
      )}
    </div>
  );
};
