import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['x-auth-token'] = token;
  }
  return config;
});

// Normalize error messages for better diagnostics
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.data?.message) {
      error.message = error.response.data.message;
    } else if (error?.message === 'Network Error') {
      error.message = 'Network error: cannot reach server at ' + API_BASE_URL;
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { name: string; email: string; password: string; role: 'employer' | 'employee'; phone?: string }) =>
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
};

// Company API
export const companyApi = {
  create: (data: { name: string; address: string }) =>
    api.post('/api/companies', data),
  get: (id: string) =>
    api.get(`/api/companies/${id}`),
};

// Job Role API
export const jobRoleApi = {
  create: (data: { name: string; defaultRates: { base: number; overtime: number; roleBonus: number }; companyId: string }) =>
    api.post('/api/jobroles', data),
  list: () =>
    api.get('/api/jobroles'),
};

// Employee API
export const employeeApi = {
  add: (data: { name: string; email: string; phone: string; jobRoleId: string }) =>
    api.post('/api/employees', data),
  list: () =>
    api.get('/api/employees'),
};

// Time Logs API
export const timeLogApi = {
  clockIn: (data: { method: string; location: { lat: number; lng: number } }) =>
    api.post('/api/timelogs/clockin', data),
  clockOut: (id: string) =>
    api.patch(`/api/timelogs/${id}/clockout`),
  startBreak: (id: string, data: { type: string }) =>
    api.post(`/api/timelogs/${id}/break/start`, data),
  endBreak: (id: string) =>
    api.patch(`/api/timelogs/${id}/break/end`),
  approve: (id: string) =>
    api.patch(`/api/timelogs/${id}/approve`),
  getPending: () =>
    api.get('/api/timelogs/pending'),
  getMyLogs: () =>
    api.get('/api/timelogs/my'),
};

// Payment API
export const paymentApi = {
  calculate: (data: { employeeId: string; periodStart: string; periodEnd: string }) =>
    api.post('/api/payments/calculate', data),
  create: (data: { employeeId: string; periodStart: string; periodEnd: string; totalHours: number; amount: number }) =>
    api.post('/api/payments', data),
  approve: (id: string) =>
    api.patch(`/api/payments/${id}/approve`),
  disburse: (id: string) =>
    api.patch(`/api/payments/${id}/disburse`),
  getPending: () =>
    api.get('/api/payments/pending'),
  getMyPayments: () =>
    api.get('/api/payments/my'),
};

// Analytics API
export const analyticsApi = {
  generateAttendance: (data: { periodStart: string; periodEnd: string }) =>
    api.post('/api/analytics/attendance', data),
  get: (params: { type: string; period: string }) =>
    api.get('/api/analytics', { params }),
};

export default api;
