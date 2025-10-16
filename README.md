# SmartPay Backend

An automated payroll system with time tracking and Arifpay payment integration.

## Features

- **User Authentication**: JWT-based authentication for employers and employees
- **Company Management**: Each company has its own configuration and settings
- **Employee Management**: Employers can add, edit, and manage employees
- **Time Tracking**: Clock-in/out system with automatic hour calculations
- **Payroll Computation**: Automated salary calculation based on hours worked
- **Arifpay Integration**: Digital payment processing with webhook support
- **Automated Scheduler**: Automated payroll processing based on payment cycles
- **Security**: Rate limiting, input validation, and security headers

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Arifpay merchant account

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smartpay-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp env.example .env
```

4. Update `.env` with your configuration:
```
PORT=5000
MONGO_URI=your_mongo_connection_string
JWT_SECRET=your_secret_key
ARIFPAY_MERCHANT_KEY=your_arifpay_key
FRONTEND_URL=http://localhost:3000
ARIFPAY_WEBHOOK_URL=https://your-domain.com/api/payments/webhook/arifpay
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user profile

### Company Management
- `GET /api/company/my/company` - Get company details
- `PUT /api/company/my/company` - Update company settings
- `GET /api/company/my/stats` - Get company statistics

### Employee Management
- `POST /api/employees` - Add new employee (employer only)
- `GET /api/employees` - Get all employees (employer only)
- `GET /api/employees/my/profile` - Get employee profile
- `PUT /api/employees/:id` - Update employee (employer only)
- `DELETE /api/employees/:id` - Delete employee (employer only)

### Time Tracking
- `POST /api/time-logs/clock-in` - Clock in (employee only)
- `POST /api/time-logs/clock-out` - Clock out (employee only)
- `GET /api/time-logs/my/status` - Get current clock status
- `GET /api/time-logs/my` - Get employee time logs
- `GET /api/time-logs/company` - Get company time logs (employer only)
- `PUT /api/time-logs/:id/approve` - Approve time log (employer only)

### Payments
- `POST /api/payments/process-payroll` - Process payroll and initiate payments
- `GET /api/payments` - Get payments (employer only)
- `GET /api/payments/summary` - Get payroll summary
- `POST /api/payments/initiate` - Initiate payment for specific employee
- `POST /api/payments/retry-failed` - Retry failed payments
- `POST /api/payments/webhook/arifpay` - Arifpay webhook endpoint

## Database Models

### User
- email, password, role (employer/employee), companyId, isActive

### Company
- name, employerName, employerId, paymentCycle, bonusRateMultiplier, maxDailyHours, arifpayMerchantKey

### Employee
- userId, companyId, name, hourlyRate, status, employeeId, department, position

### TimeLog
- employeeId, clockIn, clockOut, duration, regularHours, bonusHours, status, notes

### Payment
- employeeId, amount, period, status, arifpayTransactionId, paymentDate, timeLogIds

## Automated Features

The system includes automated schedulers for:

- **Daily Payroll**: Runs every midnight for companies with daily payment cycle
- **Weekly Payroll**: Runs every Sunday at midnight for weekly cycle
- **Monthly Payroll**: Runs on the 1st of every month for monthly cycle
- **Cleanup Tasks**: Removes old failed payments (older than 30 days)
- **Health Checks**: Monitors for stuck payments and updates their status

## Security Features

- Rate limiting on all endpoints
- JWT-based authentication
- Input validation and sanitization
- Security headers (Helmet)
- CORS protection
- Password hashing with bcrypt

## Payment Integration

The system integrates with Arifpay for digital payments:

- Automatic payment session creation
- Webhook handling for payment status updates
- Retry mechanism for failed payments
- Bulk payment processing

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Server port | No (default: 5000) |
| MONGO_URI | MongoDB connection string | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| ARIFPAY_MERCHANT_KEY | Arifpay merchant key | Yes |
| FRONTEND_URL | Frontend application URL | No |
| ARIFPAY_WEBHOOK_URL | Webhook URL for Arifpay | No |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License
