const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import middleware
const {
  generalLimiter,
  authLimiter,
  paymentLimiter,
  helmetConfig,
  corsOptions,
  sanitizeInput,
  requestLogger,
  errorHandler,
  notFoundHandler
} = require('./middleware/securityMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const timeLogRoutes = require('./routes/timeLogRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const jobRoleRoutes = require('./routes/jobRoleRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// Security middleware
app.use(helmetConfig);
app.use(cors(corsOptions));

// Rate limiting
app.use(generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/payments', paymentLimiter);

// Body parsing middleware (capture raw body for signature verification on webhooks)
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    if (buf && buf.length) {
      req.rawBody = buf.toString('utf8');
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Input sanitization
app.use(sanitizeInput);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/time-logs', timeLogRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/jobroles', jobRoleRoutes);
app.use('/api/analytics', analyticsRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'SmartPay Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      company: '/api/company',
      employees: '/api/employees',
      timeLogs: '/api/time-logs',
      payments: '/api/payments',
      jobRoles: '/api/jobroles',
      analytics: '/api/analytics'
    },
    documentation: {
      signup: 'POST /api/auth/signup',
      login: 'POST /api/auth/login',
      profile: 'GET /api/auth/profile',
      clockIn: 'POST /api/time-logs/clock-in',
      clockOut: 'POST /api/time-logs/clock-out',
      processPayroll: 'POST /api/payments/process-payroll',
      webhook: 'POST /api/payments/webhook/arifpay',
      jobRoles: 'GET /api/jobroles',
      analytics: 'GET /api/analytics'
    }
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
