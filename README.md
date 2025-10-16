# SmartPay Backend

An automated payroll system with time tracking and Arifpay Telebirr B2C payment integration.

## Features

- **User Authentication**: JWT-based authentication for employers and employees
- **Company Management**: Each company has its own configuration and settings
- **Employee Management**: Employers can add, edit, and manage employees
- **Time Tracking**: Clock-in/out system with automatic hour calculations
- **Payroll Computation**: Automated salary calculation based on hours worked
- **Arifpay B2C Integration**: Direct salary disbursement to employee Telebirr wallets
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

### Payments (Arifpay B2C Payout)
- `POST /api/payments/process-payroll` - Process payroll and initiate B2C payouts
- `GET /api/payments` - Get payments (employer only)
- `GET /api/payments/summary` - Get payroll summary
- `POST /api/payments/initiate` - Initiate B2C payout for specific employee
- `POST /api/payments/retry-failed` - Retry failed B2C payments
- `POST /api/payments/webhook/arifpay` - Arifpay B2C webhook endpoint (no auth required)

## Database Models

### User
- email, password, role (employer/employee), companyId, isActive

### Company
- name, employerName, employerId, paymentCycle, bonusRateMultiplier, maxDailyHours, arifpayMerchantKey

### Employee
- userId, companyId, name, hourlyRate, status, department, position, telebirrMsisdn (required for B2C payouts)

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

The system uses **Arifpay Telebirr B2C** for direct salary disbursement:

### 2-Step B2C Process
1. **Create Session**: `POST https://api.arifpay.et/api/Telebirr/b2c/session` - Initialize B2C transaction and receive session_id
2. **Execute Transfer**: `POST https://api.arifpay.et/api/Telebirr/b2c/transfer` - Finalize transfer using session_id and employee phone number

### Features
- Direct transfer to employee Telebirr wallets
- Automated webhook handling for payment status updates
- Retry mechanism for failed payments (max 3 retries)
- Bulk payment processing for multiple employees
- Secure webhook signature verification

### Phone Number Format
Employee Telebirr numbers must be in format: **251XXXXXXXXX** (e.g., 251912345678)

### Transaction Status Codes
- **SUCCESS**: Payment completed successfully
- **PENDING**: Payment in progress
- **FAILED**: Payment failed
- **CANCELED/CANCELLED**: User cancelled
- **EXPIRED**: Session timed out
- **UNAUTHORIZED/FORBIDDEN**: Authorization error

### Important Notes
- All active employees **must have** `telebirrMsisdn` field populated
- Phone numbers must include country code: `251XXXXXXXXX` or `+251XXXXXXXXX`
- Webhook endpoint must return **HTTP 200** for Arifpay to mark it as processed
- Ensure your Arifpay account has **Payouts/Disbursements** feature enabled
- Test in sandbox mode first before production (set `ARIFPAY_BASE_URL` to sandbox endpoint)

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| PORT | Server port | No (default: 5000) |
| MONGO_URI | MongoDB connection string | Yes |
| JWT_SECRET | JWT signing secret | Yes |
| ARIFPAY_MERCHANT_KEY | Arifpay merchant key for B2C payouts | Yes |
| ARIFPAY_BASE_URL | Arifpay API base URL (or sandbox URL for testing) | No (default: https://api.arifpay.et) |
| API_BASE_URL | Your backend API URL (for webhook callbacks) | Yes (for production) |
| FRONTEND_URL | Frontend application URL | No |
| ARIFPAY_DRY_RUN | Set to "true" for testing without real API calls | No (default: false) |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License
