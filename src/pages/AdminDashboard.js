import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { timesheetsAPI, employeesAPI, invoicesAPI } from '../services/api';

function AdminDashboard() {
  const { user, logout } = useAuth();
  const [timesheets, setTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [activeTab, setActiveTab] = useState('timesheets');
  
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [employeeFormData, setEmployeeFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Caregiver'
  });

  const loadData = useCallback(async () => {
    try {
      const params = {};
      if (selectedMonth !== 'all') {
        const [year, month] = selectedMonth.split('-');
        params.startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        params.endDate = `${year}-${month}-${lastDay}`;
      }

      const [timesheetsRes, employeesRes, statsRes] = await Promise.all([
        timesheetsAPI.getAll(params),
        employeesAPI.getAll(),
        timesheetsAPI.getStats(params)
      ]);

      setTimesheets(timesheetsRes.data);
      setEmployees(employeesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      showNotification('Error loading data: ' + error.message, 'error');
    }
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteTimesheet = async (id) => {
    if (!window.confirm('Delete this timesheet entry?')) return;
    try {
      await timesheetsAPI.delete(id);
      showNotification('Timesheet deleted!');
      loadData();
    } catch (error) {
      showNotification('Error: ' + error.message, 'error');
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      await employeesAPI.create(employeeFormData);
      showNotification('Employee created successfully!');
      setShowEmployeeForm(false);
      setEmployeeFormData({ name: '', email: '', password: '', role: 'Caregiver' });
      loadData();
    } catch (error) {
      showNotification('Error: ' + (error.response?.data?.error || error.message), 'error');
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Delete this employee? This will also delete all their timesheets.')) return;
    try {
      await employeesAPI.delete(id);
      showNotification('Employee deleted!');
      loadData();
    } catch (error) {
      showNotification('Error: ' + error.message, 'error');
    }
  };

  const loadJsPDF = () => {
    return new Promise((resolve, reject) => {
      if (window.jspdf) {
        resolve(window.jspdf.jsPDF);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => resolve(window.jspdf.jsPDF);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const downloadClientInvoice = async () => {
    try {
      showNotification('Generating PDF...', 'info');
      
      const params = {};
      if (selectedMonth !== 'all') {
        const [year, month] = selectedMonth.split('-');
        params.startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        params.endDate = `${year}-${month}-${lastDay}`;
      }

      const response = await invoicesAPI.getClientInvoice(params);
      const invoice = response.data;

      // Group by employee (caregiver)
      const employeeGroups = {};
      invoice.entries.forEach(entry => {
        if (!employeeGroups[entry.caregiver]) {
          employeeGroups[entry.caregiver] = {
            fullDays: 0,
            halfDays: 0
          };
        }
        if (entry.service_type === 'Full Day') {
          employeeGroups[entry.caregiver].fullDays++;
        } else {
          employeeGroups[entry.caregiver].halfDays++;
        }
      });

      const jsPDF = await loadJsPDF();
      const doc = new jsPDF();

      // Header
      doc.setFontSize(24);
      doc.setTextColor(102, 126, 234);
      doc.text('SuperchargedByGrace', 105, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text('Client Invoice', 105, 30, { align: 'center' });

      // Invoice Info
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`, 20, 45);

      // Billing Summary Box
      doc.setFillColor(248, 249, 255);
      doc.rect(20, 55, 170, 45, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(102, 126, 234);
      doc.text('Billing Summary', 25, 65);

      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(`Full Days (${invoice.summary.full_days})`, 25, 75);
      doc.text(`$${invoice.summary.full_days_total}`, 170, 75, { align: 'right' });

      doc.text(`Half Days (${invoice.summary.half_days})`, 25, 83);
      doc.text(`$${invoice.summary.half_days_total}`, 170, 83, { align: 'right' });

      doc.setLineWidth(0.5);
      doc.line(25, 88, 185, 88);

      doc.setFontSize(12);
      doc.setTextColor(102, 126, 234);
      doc.text('Total Amount Due', 25, 95);
      doc.text(`$${invoice.summary.total_amount}`, 170, 95, { align: 'right' });

      // Service Details
      let yPos = 115;
      doc.setFontSize(12);
      doc.setTextColor(102, 126, 234);
      doc.text('Service Details by Caregiver', 20, yPos);

      yPos += 10;
      doc.setFontSize(10);
      doc.setTextColor(60);

      Object.entries(employeeGroups).forEach(([caregiver, days]) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        doc.setDrawColor(224, 224, 224);
        doc.setFillColor(255, 255, 255);
        doc.rect(20, yPos - 5, 170, 20, 'FD');

        doc.setFont(undefined, 'bold');
        doc.text(caregiver, 25, yPos);
        doc.setFont(undefined, 'normal');

        yPos += 7;
        if (days.fullDays > 0) {
          doc.text(`${days.fullDays} Full Day${days.fullDays > 1 ? 's' : ''}`, 30, yPos);
          yPos += 6;
        }
        if (days.halfDays > 0) {
          doc.text(`${days.halfDays} Half Day${days.halfDays > 1 ? 's' : ''}`, 30, yPos);
          yPos += 6;
        }

        yPos += 8;
      });

      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text('Payment Terms: Net 30 Days', 105, 280, { align: 'center' });
        doc.text('Thank you for your business!', 105, 285, { align: 'center' });
      }

      doc.save(`client-invoice-${selectedMonth}-${Date.now()}.pdf`);
      showNotification('Client invoice PDF downloaded!');
    } catch (error) {
      showNotification('Error generating invoice: ' + error.message, 'error');
    }
  };

  const downloadPayrollReport = async () => {
    try {
      showNotification('Generating PDF...', 'info');
      
      const params = {};
      if (selectedMonth !== 'all') {
        const [year, month] = selectedMonth.split('-');
        params.startDate = `${year}-${month}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        params.endDate = `${year}-${month}-${lastDay}`;
      }

      const response = await invoicesAPI.getPayrollReport(params);
      const report = response.data;

      const jsPDF = await loadJsPDF();
      const doc = new jsPDF();

      // Header
      doc.setFontSize(24);
      doc.setTextColor(249, 115, 22);
      doc.text('SuperchargedByGrace', 105, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.text('Employee Payroll Report', 105, 30, { align: 'center' });

      // Report Info
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 20, 45);
      doc.text(`Period: ${report.period.start} to ${report.period.end}`, 20, 52);

      // Payroll Summary Box
      doc.setFillColor(255, 247, 237);
      doc.rect(20, 60, 170, 45, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(249, 115, 22);
      doc.text('Payroll Summary', 25, 70);

      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(`Total Entries`, 25, 80);
      doc.text(`${report.summary.total_entries}`, 170, 80, { align: 'right' });

      doc.text(`Total Hours`, 25, 88);
      doc.text(`${report.summary.total_hours}h`, 170, 88, { align: 'right' });

      doc.setLineWidth(0.5);
      doc.line(25, 93, 185, 93);

      doc.setFontSize(12);
      doc.setTextColor(249, 115, 22);
      doc.text('Total Payroll', 25, 100);
      doc.text(`$${report.summary.total_payroll}`, 170, 100, { align: 'right' });

      // Employee Breakdown
      let yPos = 120;
      doc.setFontSize(12);
      doc.setTextColor(249, 115, 22);
      doc.text('Employee Breakdown', 20, yPos);

      yPos += 8;
      doc.setFontSize(9);
      doc.setTextColor(60);

      // Table header
      doc.setFillColor(249, 115, 22);
      doc.setTextColor(255);
      doc.rect(20, yPos - 5, 170, 8, 'F');
      doc.text('Employee', 25, yPos);
      doc.text('Hours', 120, yPos);
      doc.text('Pay', 145, yPos);
      doc.text('Entries', 170, yPos);

      yPos += 8;
      doc.setTextColor(60);

      report.employee_breakdown.forEach((emp, idx) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        if (idx % 2 === 0) {
          doc.setFillColor(255, 247, 237);
          doc.rect(20, yPos - 5, 170, 7, 'F');
        }

        doc.text(emp.employee_name, 25, yPos);
        doc.text(`${emp.total_hours}h`, 120, yPos);
        doc.text(`$${emp.total_pay}`, 145, yPos);
        doc.text(`${emp.entries}`, 170, yPos);

        yPos += 7;
      });

      // Detailed Records (new page)
      doc.addPage();
      yPos = 20;
      
      doc.setFontSize(12);
      doc.setTextColor(249, 115, 22);
      doc.text('Detailed Timesheet Records', 20, yPos);

      yPos += 8;
      doc.setFontSize(8);

      // Table header
      doc.setFillColor(249, 115, 22);
      doc.setTextColor(255);
      doc.rect(20, yPos - 4, 170, 7, 'F');
      doc.text('Date', 22, yPos);
      doc.text('Employee', 50, yPos);
      doc.text('Hours', 130, yPos);
      doc.text('Pay', 155, yPos);
      doc.text('Rate', 175, yPos);

      yPos += 7;
      doc.setTextColor(60);

      report.entries.forEach((entry, idx) => {
        if (yPos > 275) {
          doc.addPage();
          yPos = 20;
          
          // Repeat header on new page
          doc.setFillColor(249, 115, 22);
          doc.setTextColor(255);
          doc.rect(20, yPos - 4, 170, 7, 'F');
          doc.text('Date', 22, yPos);
          doc.text('Employee', 50, yPos);
          doc.text('Hours', 130, yPos);
          doc.text('Pay', 155, yPos);
          doc.text('Rate', 175, yPos);
          yPos += 7;
          doc.setTextColor(60);
        }

        if (idx % 2 === 0) {
          doc.setFillColor(255, 247, 237);
          doc.rect(20, yPos - 4, 170, 6, 'F');
        }

        doc.text(new Date(entry.date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }), 22, yPos);
        doc.text(entry.employee.substring(0, 30), 50, yPos);
        doc.text(`${entry.hours}h`, 130, yPos);
        doc.text(`$${entry.pay}`, 155, yPos);
        
        const rateText = entry.rate_type.includes('8-hour') ? '8hr' : 
                        entry.rate_type.includes('12-hour') ? '12hr' : 'Ext';
        doc.text(rateText, 175, yPos);

        yPos += 6;
      });

      // Footer on all pages
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Total Payroll: $${report.summary.total_payroll}`, 105, 285, { align: 'center' });
      }

      doc.save(`payroll-report-${selectedMonth}-${Date.now()}.pdf`);
      showNotification('Payroll report PDF downloaded!');
    } catch (error) {
      showNotification('Error generating report: ' + error.message, 'error');
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '50px', height: '50px', border: '4px solid rgba(255,255,255,0.2)', borderTop: '4px solid white', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
          <div style={{ color: 'white' }}>Loading...</div>
        </div>
      </div>
    );
  }

  const totalRevenue = stats?.total_revenue || 0;
  const totalPayroll = stats?.total_payroll || 0;
  const totalProfit = totalRevenue - totalPayroll;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: 'white' }}>
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: notification.type === 'error' ? '#fee2e2' : notification.type === 'info' ? '#dbeafe' : '#dcfce7',
          color: notification.type === 'error' ? '#dc2626' : notification.type === 'info' ? '#2563eb' : '#16a34a',
          padding: '16px 24px',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          border: `2px solid ${notification.type === 'error' ? '#fecaca' : notification.type === 'info' ? '#bfdbfe' : '#bbf7d0'}`
        }}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '20px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
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
            <h1 style={{ fontSize: '20px', fontWeight: '700', margin: 0, fontFamily: '"Playfair Display", serif' }}>SuperchargedByGrace</h1>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>Welcome, {user?.name}</p>
          </div>
        </div>
        <button onClick={logout} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '10px',
          color: 'white',
          fontWeight: '600',
          cursor: 'pointer'
        }}>
          🚪 Sign Out
        </button>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
          {[
            { id: 'timesheets', label: '⏰ Timesheets', icon: '⏰' },
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'employees', label: '👥 Employees', icon: '👥' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 24px',
                background: activeTab === tab.id ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${activeTab === tab.id ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '10px',
                color: 'white',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '15px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
              marginBottom: '32px'
            }}>
              <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'rgba(102, 126, 234, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💵</div>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '500' }}>Client Revenue</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700' }}>${totalRevenue}</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'rgba(249, 115, 22, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>💰</div>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '500' }}>Employee Payroll</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700' }}>${totalPayroll}</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'rgba(34, 197, 94, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📈</div>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '500' }}>Profit Margin</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#22c55e' }}>${totalProfit}</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>{profitMargin}% margin</div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', background: 'rgba(168, 85, 247, 0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>⏱️</div>
                  <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', fontWeight: '500' }}>Total Hours</span>
                </div>
                <div style={{ fontSize: '32px', fontWeight: '700' }}>{stats?.total_hours || 0}</div>
              </div>
            </div>

            {/* Filters and Actions */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                <option value="all">All Time</option>
                <option value="2024-12">December 2024</option>
                <option value="2024-11">November 2024</option>
                <option value="2024-10">October 2024</option>
                <option value="2024-09">September 2024</option>
              </select>

              <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  onClick={downloadClientInvoice}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  📄 Client Invoice PDF
                </button>

                <button
                  onClick={downloadPayrollReport}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: 'rgba(249, 115, 22, 0.9)',
                    border: 'none',
                    borderRadius: '10px',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  💼 Payroll Report PDF
                </button>
              </div>
            </div>

            {/* Employee Performance */}
            <div style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden',
              marginBottom: '24px'
            }}>
              <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Employee Performance</h3>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  {employees.filter(e => e.role !== 'Administrator').map(emp => {
                    const empTimesheets = timesheets.filter(ts => ts.employee_id === emp.id);
                    const empHours = empTimesheets.reduce((sum, ts) => sum + ts.hours, 0);
                    const empRevenue = empTimesheets.reduce((sum, ts) => sum + ts.client_charge, 0);
                    const empPayroll = empTimesheets.reduce((sum, ts) => sum + ts.employee_pay, 0);
                    const empProfit = empRevenue - empPayroll;

                    return (
                      <div key={emp.id} style={{
                        padding: '20px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>{emp.name}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Hours</span>
                          <span style={{ fontWeight: '600' }}>{empHours}h</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Client Revenue</span>
                          <span style={{ fontWeight: '600', color: '#667eea' }}>${empRevenue}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Payroll</span>
                          <span style={{ fontWeight: '600', color: '#f97316' }}>${empPayroll}</span>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          paddingTop: '8px',
                          borderTop: '1px solid rgba(255,255,255,0.1)',
                          marginTop: '4px'
                        }}>
                          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Profit</span>
                          <span style={{ fontWeight: '600', color: '#22c55e' }}>${empProfit}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Timesheets Tab */}
        {activeTab === 'timesheets' && (
          <div style={{
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>All Timesheet Entries ({timesheets.length})</h3>
            </div>

            {timesheets.length === 0 ? (
              <div style={{ padding: '64px 24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                <p style={{ fontSize: '16px', margin: 0 }}>No entries found</p>
              </div>
            ) : (
              <div style={{ padding: '24px' }}>
                {timesheets.sort((a, b) => new Date(b.date) - new Date(a.date)).map((ts, idx) => (
                  <div key={ts.id} style={{
                    padding: '20px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    marginBottom: idx < timesheets.length - 1 ? '12px' : 0,
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', flex: 1 }}>
                        <div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Employee</div>
                          <div style={{ fontSize: '15px', fontWeight: '600' }}>{ts.employee_name}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Date</div>
                          <div style={{ fontSize: '15px', fontWeight: '600' }}>{new Date(ts.date).toLocaleDateString()}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Hours</div>
                          <div style={{ fontSize: '15px', fontWeight: '600' }}>{ts.hours}h</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Client Charge</div>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#667eea' }}>${ts.client_charge}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Employee Pay</div>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#f97316' }}>${ts.employee_pay}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>Profit</div>
                          <div style={{ fontSize: '15px', fontWeight: '700', color: '#22c55e' }}>${ts.profit}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteTimesheet(ts.id)}
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
                    {ts.notes && (
                      <div style={{
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.6)',
                        fontStyle: 'italic',
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        {ts.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <>
            <button
              onClick={() => setShowEmployeeForm(!showEmployeeForm)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 24px',
                background: showEmployeeForm ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                marginBottom: '24px'
              }}
            >
              {showEmployeeForm ? '❌ Cancel' : '➕ Add New Employee'}
            </button>

            {showEmployeeForm && (
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                padding: '32px',
                borderRadius: '16px',
                marginBottom: '24px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '24px' }}>Create New Employee</h3>
                <form onSubmit={handleCreateEmployee}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Name</label>
                      <input
                        type="text"
                        value={employeeFormData.name}
                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, name: e.target.value })}
                        required
                        style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: 'white', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Email</label>
                      <input
                        type="email"
                        value={employeeFormData.email}
                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, email: e.target.value })}
                        required
                        style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: 'white', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Password</label>
                      <input
                        type="password"
                        value={employeeFormData.password}
                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, password: e.target.value })}
                        required
                        minLength={6}
                        style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: 'white', fontSize: '15px' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>Role</label>
                      <select
                        value={employeeFormData.role}
                        onChange={(e) => setEmployeeFormData({ ...employeeFormData, role: e.target.value })}
                        style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '10px', color: 'white', fontSize: '15px', cursor: 'pointer' }}
                      >
                        <option value="Caregiver">Caregiver</option>
                        <option value="Administrator">Administrator</option>
                      </select>
                    </div>
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
                      cursor: 'pointer'
                    }}
                  >
                    ➕ Create Employee
                  </button>
                </form>
              </div>
            )}

            <div style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(10px)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>All Employees ({employees.length})</h3>
              </div>
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gap: '12px' }}>
                  {employees.map(emp => (
                    <div key={emp.id} style={{
                      padding: '20px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{emp.name}</div>
                        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>{emp.email}</div>
                        <div style={{
                          display: 'inline-block',
                          marginTop: '8px',
                          padding: '4px 12px',
                          background: emp.role === 'Administrator' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(102, 126, 234, 0.2)',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600'
                        }}>
                          {emp.role}
                        </div>
                      </div>
                      {emp.id !== user.id && (
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          style={{
                            padding: '8px 16px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '8px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            fontWeight: '600',
                            fontSize: '14px'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
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

export default AdminDashboard;
