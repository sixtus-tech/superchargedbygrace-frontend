import axios from 'axios';

const API_URL = 'https://api.superchargedbygrace.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getCurrentUser: () => api.get('/auth/me'),
};

// Timesheets API
export const timesheetsAPI = {
  getAll: (params) => api.get('/timesheets', { params }),
  getOne: (id) => api.get(`/timesheets/${id}`),
  create: (data) => api.post('/timesheets', data),
  update: (id, data) => api.put(`/timesheets/${id}`, data),
  delete: (id) => api.delete(`/timesheets/${id}`),
  getStats: (params) => api.get('/timesheets/summary', { params }),
};

// Employees API
export const employeesAPI = {
  getAll: () => api.get('/employees'),
  getOne: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  getStats: (id, params) => api.get(`/employees/${id}/stats`, { params }),
};

// Invoices API
export const invoicesAPI = {
  getClientInvoice: (params) => api.get('/invoices/client', { params }),
  getPayrollReport: (params) => api.get('/invoices/payroll', { params }),
  getComprehensive: (params) => api.get('/invoices/comprehensive', { params }),
};

// Houses API
export const housesAPI = {
  getAll: () => api.get('/houses'),
  getOne: (id) => api.get(`/houses/${id}`),
  create: (data) => api.post('/houses', data),
  update: (id, data) => api.put(`/houses/${id}`, data),
  delete: (id) => api.delete(`/houses/${id}`),
};

export default api;