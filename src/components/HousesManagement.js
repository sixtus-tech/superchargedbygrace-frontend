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

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const loadHouses = useCallback(async () => {
    try {
      const response = await housesAPI.getAll();
      setHouses(response.data);
      setLoading(false);
    } catch (error) {
      showNotification('Error loading houses: ' + error.message, 'error');
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadHouses();
  }, [loadHouses]);

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this house? Employees assigned to this house will be unassigned.')) return;
    try {
      await housesAPI.delete(id);
      showNotification('House deleted successfully!');
      loadHouses();
    } catch (error) {
      showNotification('Error: ' + error.message, 'error');
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
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.6)' }}>
        <div style={{ fontSize: '20px' }}>Loading houses...</div>
      </div>
    );
  }

  const profitMargin = formData.client_charge_per_day && formData.employee_pay_per_day
    ? (((parseFloat(formData.client_charge_per_day) - parseFloat(formData.employee_pay_per_day)) / parseFloat(formData.client_charge_per_day)) * 100).toFixed(1)
    : 0;

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

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '700', margin: '0 0 8px 0', color: 'white' }}>🏠 Houses Management</h2>
        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Manage care facilities and their billing rates</p>
      </div>

      {/* Add/Edit Button */}
      <button
        onClick={() => showForm ? resetForm() : setShowForm(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 28px',
          background: showForm ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          color: 'white',
          border: showForm ? '2px solid rgba(255,255,255,0.2)' : 'none',
          borderRadius: '12px',
          fontSize: '15px',
          fontWeight: '600',
          cursor: 'pointer',
          marginBottom: '24px',
          boxShadow: showForm ? 'none' : '0 4px 12px rgba(34, 197, 94, 0.3)',
          transition: 'all 0.2s'
        }}
      >
        {showForm ? '❌ Cancel' : '➕ Add New House'}
      </button>

      {/* Add/Edit Form */}
      {showForm && (
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: '32px',
          borderRadius: '16px',
          marginBottom: '32px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px', color: 'white' }}>
            {editingId ? '✏️ Edit House' : '➕ Add New House'}
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>
                  House Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Frisco, Plano Ambrosia"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '2px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '15px',
                    outline: 'none',
                    transition: 'border 0.2s'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>
                  Employee Pay (per day) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '16px', fontWeight: '600' }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.employee_pay_per_day}
                    onChange={(e) => setFormData({ ...formData, employee_pay_per_day: e.target.value })}
                    required
                    placeholder="150.00"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 32px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '2px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>
                  Client Charge (per day) *
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '16px', fontWeight: '600' }}>$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.client_charge_per_day}
                    onChange={(e) => setFormData({ ...formData, client_charge_per_day: e.target.value })}
                    required
                    placeholder="200.00"
                    style={{
                      width: '100%',
                      padding: '12px 16px 12px 32px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '2px solid rgba(255,255,255,0.1)',
                      borderRadius: '10px',
                      color: 'white',
                      fontSize: '15px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>
                  Payment Frequency *
                </label>
                <select
                  value={formData.payment_frequency}
                  onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '2px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '15px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="weekly" style={{ background: '#1a1a2e', color: 'white' }}>Weekly</option>
                  <option value="bi-weekly" style={{ background: '#1a1a2e', color: 'white' }}>Bi-weekly</option>
                  <option value="monthly" style={{ background: '#1a1a2e', color: 'white' }}>Monthly</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>
                  Invoice Style *
                </label>
                <select
                  value={formData.invoice_style}
                  onChange={(e) => setFormData({ ...formData, invoice_style: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '2px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '15px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="grouped" style={{ background: '#1a1a2e', color: 'white' }}>Grouped</option>
                  <option value="daily" style={{ background: '#1a1a2e', color: 'white' }}>Daily</option>
                </select>
              </div>
            </div>

            {/* Profit Margin Display */}
            {formData.employee_pay_per_day && formData.client_charge_per_day && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: '10px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Daily Profit</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e' }}>
                      ${(parseFloat(formData.client_charge_per_day) - parseFloat(formData.employee_pay_per_day)).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Profit Margin</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e' }}>{profitMargin}%</div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Special instructions, billing details, etc..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '2px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
              }}
            >
              {editingId ? '💾 Update House' : '➕ Create House'}
            </button>
          </form>
        </div>
      )}

      {/* Houses Grid */}
      {houses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', color: 'rgba(255,255,255,0.5)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏠</div>
          <p style={{ fontSize: '16px', margin: 0 }}>No houses yet. Add your first one!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {houses.map(house => {
            const profit = house.client_charge_per_day - house.employee_pay_per_day;
            const margin = ((profit / house.client_charge_per_day) * 100).toFixed(1);

            return (
              <div
                key={house.id}
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',
                  padding: '24px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                }}
              >
                {/* House Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ fontSize: '22px', fontWeight: '700', margin: '0 0 8px 0', color: 'white' }}>
                      🏠 {house.name}
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '4px 10px',
                        background: 'rgba(102, 126, 234, 0.2)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#667eea',
                        textTransform: 'capitalize'
                      }}>
                        {house.payment_frequency}
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        background: 'rgba(168, 85, 247, 0.2)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#a855f7',
                        textTransform: 'capitalize'
                      }}>
                        {house.invoice_style}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rates */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Employee Pay/Day</span>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#f97316' }}>${house.employee_pay_per_day}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Client Charge/Day</span>
                    <span style={{ fontSize: '18px', fontWeight: '700', color: '#667eea' }}>${house.client_charge_per_day}</span>
                  </div>
                  <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    paddingTop: '10px',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Profit ({margin}%)</span>
                    <span style={{ fontSize: '20px', fontWeight: '700', color: '#22c55e' }}>${profit.toFixed(2)}</span>
                  </div>
                </div>

                {/* Notes */}
                {house.notes && (
                  <div style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.5)',
                    fontStyle: 'italic',
                    marginBottom: '16px',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    borderLeft: '3px solid rgba(255,255,255,0.2)'
                  }}>
                    {house.notes}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                  <button
                    onClick={() => handleEdit(house)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'rgba(102, 126, 234, 0.2)',
                      border: '1px solid rgba(102, 126, 234, 0.3)',
                      borderRadius: '8px',
                      color: '#667eea',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(house.id)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      color: '#ef4444',
                      fontWeight: '600',
                      fontSize: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default HousesManagement;