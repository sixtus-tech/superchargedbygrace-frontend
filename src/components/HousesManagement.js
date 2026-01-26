import React, { useState, useEffect, useCallback } from 'react';
import { housesAPI } from '../services/api';

function HousesManagement() {
  const [houses, setHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [notification, setNotification] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    employee_pay_per_day: '',
    client_charge_per_day: '',
    payment_frequency: 'weekly',
    invoice_style: 'grouped',
    notes: ''
  });

  useEffect(() => {
    loadHouses();
  }, [loadHouses]);

  const loadHouses = useCallback(async () => {
    try {
      const response = await housesAPI.getAll();
      setHouses(response.data);
    } catch (error) {
      showNotification('Error loading houses: ' + error.message, 'error');
    }
    setLoading(false);
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        employee_pay_per_day: parseFloat(formData.employee_pay_per_day),
        client_charge_per_day: parseFloat(formData.client_charge_per_day)
      };

      if (editingId) {
        await housesAPI.update(editingId, submitData);
        showNotification('House updated successfully!');
      } else {
        await housesAPI.create(submitData);
        showNotification('House created successfully!');
      }
      
      resetForm();
      loadHouses();
    } catch (error) {
      showNotification('Error: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleEdit = (house) => {
    setFormData({
      name: house.name,
      employee_pay_per_day: house.employee_pay_per_day.toString(),
      client_charge_per_day: house.client_charge_per_day.toString(),
      payment_frequency: house.payment_frequency,
      invoice_style: house.invoice_style,
      notes: house.notes || ''
    });
    setEditingId(house.id);
    setShowForm(true);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;
    
    try {
      await housesAPI.delete(id);
      showNotification('House deleted successfully!');
      loadHouses();
    } catch (error) {
      showNotification('Error: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      employee_pay_per_day: '',
      client_charge_per_day: '',
      payment_frequency: 'weekly',
      invoice_style: 'grouped',
      notes: ''
    });
    setEditingId(null);
    setShowForm(false);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading houses...</div>;
  }

  return (
    <div>
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

      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>Houses Management</h2>
        <button
          onClick={() => showForm ? resetForm() : setShowForm(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: showForm ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: showForm ? 'none' : '0 4px 12px rgba(102, 126, 234, 0.3)'
          }}
        >
          {showForm ? '❌ Cancel' : '➕ Add House'}
        </button>
      </div>

      {/* Add/Edit Form */}
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
            {editingId ? '✏️ Edit House' : '🏠 New House'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>
                  House Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Frisco, Plano Ambrosia"
                  style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>
                  Employee Pay (per day) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.employee_pay_per_day}
                  onChange={(e) => setFormData({ ...formData, employee_pay_per_day: e.target.value })}
                  required
                  placeholder="150"
                  style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>
                  Client Charge (per day) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.client_charge_per_day}
                  onChange={(e) => setFormData({ ...formData, client_charge_per_day: e.target.value })}
                  required
                  placeholder="200"
                  style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>
                  Payment Frequency *
                </label>
                <select
                  value={formData.payment_frequency}
                  onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', cursor: 'pointer', background: 'white' }}
                >
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>
                  Invoice Style *
                </label>
                <select
                  value={formData.invoice_style}
                  onChange={(e) => setFormData({ ...formData, invoice_style: e.target.value })}
                  style={{ width: '100%', padding: '12px', border: '2px solid #e2e8f0', borderRadius: '10px', fontSize: '15px', outline: 'none', cursor: 'pointer', background: 'white' }}
                >
                  <option value="grouped">Grouped (e.g., John Doe - 5 days)</option>
                  <option value="daily">Daily (e.g., John Doe - 1/26, 1/27)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes about this house..."
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
              {editingId ? '💾 Update House' : '➕ Create House'}
            </button>
          </form>
        </div>
      )}

      {/* Houses List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        {houses.map(house => (
          <div
            key={house.id}
            style={{
              background: 'white',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              border: '1px solid #e9d5ff'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: 0 }}>
                🏠 {house.name}
              </h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleEdit(house)}
                  style={{
                    padding: '6px 12px',
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(house.id, house.name)}
                  style={{
                    padding: '6px 12px',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Employee Pay:</span>
                <span style={{ fontWeight: '600', color: '#16a34a' }}>${house.employee_pay_per_day}/day</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Client Charge:</span>
                <span style={{ fontWeight: '600', color: '#2563eb' }}>${house.client_charge_per_day}/day</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Profit Margin:</span>
                <span style={{ fontWeight: '600', color: '#7c3aed' }}>
                  ${(house.client_charge_per_day - house.employee_pay_per_day).toFixed(2)}/day
                </span>
              </div>
              <div style={{ borderTop: '1px solid #e9d5ff', paddingTop: '12px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>Payment:</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', padding: '4px 8px', borderRadius: '6px', background: '#dbeafe', color: '#2563eb' }}>
                    {house.payment_frequency}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>Invoice Style:</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', padding: '4px 8px', borderRadius: '6px', background: '#fef3c7', color: '#ca8a04' }}>
                    {house.invoice_style}
                  </span>
                </div>
              </div>
              {house.notes && (
                <div style={{ marginTop: '8px', padding: '12px', background: '#fafafa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Notes:</div>
                  <div style={{ fontSize: '14px', color: '#1a1a2e' }}>{house.notes}</div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {houses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px', color: '#94a3b8' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
          <p style={{ fontSize: '16px', margin: 0 }}>No houses yet. Click "Add House" to create one!</p>
        </div>
      )}
    </div>
  );
}

export default HousesManagement;