const app = require('./app');
const connectDB = require('./config/db');
const { initializeSchedulers } = require('./services/scheduler');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Initialize schedulers for automated payroll processing
initializeSchedulers();

// Start server
const server = app.listen(PORT, () => {
  console.log(`
  ========================================
  SmartPay Backend Server Started
  ========================================
  Port: ${PORT}
  Environment: ${process.env.NODE_ENV || 'development'}
  Health Check: http://localhost:${PORT}/health
  API Documentation: http://localhost:${PORT}/api
  ========================================
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
