import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { timesheetsAPI } from '../services/api';

function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const [timesheets, setTimesheets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [notification, setNotification] = useState(null);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: '',
    notes: ''
  });

  const loadData = useCallback(async () => {
    try {
      const [timesheetsRes, statsRes] = await Promise.all([
        timesheetsAPI.getAll(),
        timesheetsAPI.getStats()
      ]);
      setTimesheets(timesheetsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      showNotification('Error loading data: ' + error.message, 'error');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await timesheetsAPI.update(editingId, formData);
        showNotification('Timesheet updated successfully!');
      } else {
        await timesheetsAPI.create(formData);
        showNotification('Timesheet created successfully!');
      }
      resetForm();
      loadData();
    } catch (error) {
      showNotification('Error: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleEdit = (timesheet) => {
    setFormData({
      date: timesheet.date.split('T')[0],
      hours: timesheet.hours.toString(),
      notes: timesheet.notes || ''
    });
    setEditingId(timesheet.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this timesheet?')) return;
    
    try {
      await timesheetsAPI.delete(id);
      showNotification('Timesheet deleted successfully!');
      loadData();
    } catch (error) {
      showNotification('Error deleting timesheet: ' + error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      hours: '',
      notes: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '4px solid #e2e8f0', borderTop: '4px solid #667eea', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
          <div style={{ color: '#64748b' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #faf5ff, #f3e8ff)' }}>
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: notification.type === 'error' ? '#fee2e2' : '#dcfce7',
          color: notification.type === 'error' ? '#dc2626' : '#16a34a',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          border: `2px solid ${notification.type === 'error' ? '#fecaca' : '#bbf7d0'}`
        }}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e9d5ff',
        padding: '20px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>⚡</div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: 0, fontFamily: '"Playfair Display", serif' }}>SuperchargedByGrace</h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Welcome, {user?.name}</p>
          </div>
        </div>
        <button onClick={logout} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: 'white',
          border: '2px solid #e9d5ff',
          borderRadius: '10px',
          color: '#7c3aed',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
          🚪 Sign Out
        </button>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px'
        }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e9d5ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: '#ede9fe', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⏱️</div>
              <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Total Hours</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a2e' }}>{stats?.total_hours || 0}</div>
          </div>

          <div style={{ background: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e9d5ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '40px', height: '40px', background: '#dbeafe', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📋</div>
              <span style={{ color: '#64748b', fontSize: '14px', fontWeight: '500' }}>Entries</span>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#1a1a2e' }}>{stats?.total_entries || 0}</div>
          </div>
        </div>

        {/* Add Entry Button */}
        <button
          onClick={() => showForm ? resetForm() : setShowForm(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '16px 28px',
            background: showForm ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            marginBottom: '24px',
            boxShadow: showForm ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}
        >
          {showForm ? '❌ Cancel' : '➕ Add New Entry'}
        </button>

        {/* Entry Form */}
        {showForm && (
          <div style={{
            background: 'white',
            padding: '32px',
            borderRadius: '16px',
            marginBottom: '32px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            border: '1px solid #e9d5ff'
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: '#1a1a2e' }}>
              {editingId ? '✏️ Edit Timesheet Entry' : '📝 New Timesheet Entry'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>Hours Worked</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                    required
                    placeholder="8"
                    style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any additional notes..."
                  rows={3}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '16px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
              >
                {editingId ? '💾 Update Timesheet' : '➕ Submit Timesheet'}
              </button>
            </form>
          </div>
        )}

        {/* Timesheets List */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          border: '1px solid #e9d5ff'
        }}>
          <div style={{ padding: '24px', borderBottom: '1px solid #e9d5ff' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>Your Timesheets</h3>
          </div>

          {timesheets.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <p style={{ fontSize: '16px', margin: 0 }}>No timesheets yet. Add your first entry!</p>
            </div>
          ) : (
            <div style={{ padding: '24px' }}>
              {timesheets.sort((a, b) => new Date(b.date) - new Date(a.date)).map((ts, idx) => (
                <div
                  key={ts.id}
                  style={{
                    padding: '20px',
                    background: '#fafafa',
                    borderRadius: '12px',
                    marginBottom: idx < timesheets.length - 1 ? '12px' : 0,
                    border: '1px solid #e9d5ff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Date</div>
                          <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a2e' }}>
                            {new Date(ts.date + 'T00:00:00').toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Hours</div>
                          <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a2e' }}>{ts.hours}h</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Status</div>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: ts.status === 'approved' ? '#dcfce7' : ts.status === 'paid' ? '#dbeafe' : '#fef3c7',
                            color: ts.status === 'approved' ? '#16a34a' : ts.status === 'paid' ? '#2563eb' : '#ca8a04',
                            display: 'inline-block'
                          }}>
                            {ts.status}
                          </div>
                        </div>
                      </div>
                      {ts.notes && (
                        <div style={{ fontSize: '14px', color: '#64748b', fontStyle: 'italic', marginTop: '8px' }}>
                          {ts.notes}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleEdit(ts)}
                        style={{
                          padding: '8px',
                          background: 'transparent',
                          border: 'none',
                          color: '#667eea',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          fontSize: '18px'
                        }}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDelete(ts.id)}
                        style={{
                          padding: '8px',
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          borderRadius: '8px',
                          fontSize: '18px'
                        }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default EmployeeDashboard;