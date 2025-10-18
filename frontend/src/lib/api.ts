import axios from 'axios';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Add token to requests (backend expects Authorization: Bearer <token>)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
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
      error.message = 'Network error: cannot reach server';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; name: string }) =>
    api.post('/auth/signup', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
};

// Company API
export const companyApi = {
  create: (data: { name: string; employerName?: string; paymentCycle?: 'daily' | 'weekly' | 'monthly'; bonusRateMultiplier?: number; maxDailyHours?: number; arifpayMerchantKey?: string }) =>
    api.post('/company', data),
  getMy: () => api.get('/company/my/company'),
  updateMy: (data: Partial<{ name: string; employerName: string; paymentCycle: 'daily' | 'weekly' | 'monthly'; bonusRateMultiplier: number; maxDailyHours: number; arifpayMerchantKey: string }>) =>
    api.put('/company/my/company', data),
  getById: (id: string) => api.get(`/company/${id}`),
  getMyStats: () => api.get('/company/my/stats'),
};

// Job Role API
export const jobRoleApi = {
  create: (data: { name: string; defaultRates: { base: number; overtime: number; roleBonus: number } }) =>
    api.post('/jobroles', data),
  list: () => api.get('/jobroles'),
  update: (id: string, data: Partial<{ name: string; defaultRates: { base: number; overtime: number; roleBonus: number } }>) =>
    api.put(`/jobroles/${id}`, data),
  delete: (id: string) => api.delete(`/jobroles/${id}`),
};

// Employee API
export const employeeApi = {
  add: (data: { 
    name: string; 
    email: string; 
    hourlyRate: number; 
    department?: string; 
    position?: string; 
    telebirrMsisdn: string; 
    phoneNumber?: string; 
    address?: string; 
  }) => api.post('/employees', data),
  list: () => api.get('/employees'),
  get: (id: string) => api.get(`/employees/${id}`),
  update: (id: string, data: Partial<{
    name: string;
    email: string;
    hourlyRate: number;
    department: string;
    position: string;
    isActive: boolean;
    telebirrMsisdn: string;
    phoneNumber: string;
    address: string;
  }>) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
  getMyProfile: () => api.get('/employees/my/profile'),
};

// Time Logs API
export const timeLogApi = {
  clockIn: (data?: { companyId?: string }) => api.post('/time-logs/clock-in', data),
  clockOut: (data?: { companyId?: string }) => api.post('/time-logs/clock-out', data),
  startBreak: (data?: { companyId?: string; type?: string }) => api.post('/time-logs/start-break', data),
  endBreak: (data?: { companyId?: string }) => api.post('/time-logs/end-break', data),
  getMyStatus: () => api.get('/time-logs/my/status'),
  getMyLogs: (params?: { page?: number; limit?: number; status?: string; companyId?: string }) => 
    api.get('/time-logs/my', { params }),
  getCompanyLogs: (params?: { page?: number; limit?: number; status?: string; employeeId?: string }) => 
    api.get('/time-logs/company', { params }),
  approve: (id: string, data: { status: 'approved' | 'rejected'; notes?: string }) =>
    api.put(`/time-logs/${id}/approve`, data),
};

// Payment API
export const paymentApi = {
  processPayroll: () => api.post('/payments/process-payroll'),
  list: (params?: { status?: string; page?: number; limit?: number; employeeId?: string }) =>
    api.get('/payments', { params }),
  get: (paymentId: string) => api.get(`/payments/${paymentId}`),
  getMyPayments: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get('/payments/my', { params }),
  approveSingle: (paymentId: string) => api.post('/payments/approve', { paymentId }),
  approveBulk: (data: { startDate?: string; endDate?: string }) => api.post('/payments/approve/bulk', data),
  retryFailed: () => api.post('/payments/retry-failed'),
  getSummary: (params?: { startDate?: string; endDate?: string }) => 
    api.get('/payments/summary', { params }),
};

// Analytics API
export const analyticsApi = {
  generateAttendance: (data: { periodStart: string; periodEnd: string }) =>
    api.post('/analytics/attendance', data),
  get: (params: { type: string; period: string }) =>
    api.get('/analytics', { params }),
};

export default api;
