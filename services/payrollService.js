const TimeLog = require('../models/TimeLog');
const Employee = require('../models/Employee');
const Company = require('../models/Company');
const Payment = require('../models/Payment');

// Calculate payroll for a specific period
const calculatePayroll = async (companyId, startDate, endDate) => {
  try {
    // Get company details
    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    // Get all employees for the company
    const employees = await Employee.find({ 
      companyId: companyId, 
      isActive: true 
    });

    const payrollResults = [];

    for (const employee of employees) {
      // Get approved time logs for the period
      const timeLogs = await TimeLog.find({
        employeeId: employee._id,
        status: 'approved',
        clockIn: { $gte: startDate, $lte: endDate },
        clockOut: { $exists: true }
      });

      // Calculate totals
      const totalRegularHours = timeLogs.reduce((sum, log) => sum + log.regularHours, 0);
      const totalBonusHours = timeLogs.reduce((sum, log) => sum + log.bonusHours, 0);

      // Calculate payment amounts
      const regularPay = totalRegularHours * employee.hourlyRate;
      const bonusPay = totalBonusHours * employee.hourlyRate * company.bonusRateMultiplier;
      const totalPay = regularPay + bonusPay;

      // Only create payment if there are hours worked
      if (totalRegularHours > 0 || totalBonusHours > 0) {
        // Check if payment already exists for this period
        const existingPayment = await Payment.findOne({
          employeeId: employee._id,
          'period.startDate': startDate,
          'period.endDate': endDate
        });

        if (!existingPayment) {
          const payment = new Payment({
            employeeId: employee._id,
            amount: totalPay,
            period: {
              startDate,
              endDate
            },
            regularHours: totalRegularHours,
            bonusHours: totalBonusHours,
            hourlyRate: employee.hourlyRate,
            bonusRateMultiplier: company.bonusRateMultiplier,
            timeLogIds: timeLogs.map(log => log._id),
            status: 'pending'
          });

          await payment.save();

          payrollResults.push({
            employeeId: employee._id,
            employeeName: employee.name,
            paymentId: payment._id,
            regularHours: totalRegularHours,
            bonusHours: totalBonusHours,
            regularPay,
            bonusPay,
            totalPay,
            timeLogCount: timeLogs.length
          });
        } else {
          // Update existing payment if amounts differ
          if (existingPayment.amount !== totalPay) {
            existingPayment.amount = totalPay;
            existingPayment.regularHours = totalRegularHours;
            existingPayment.bonusHours = totalBonusHours;
            existingPayment.timeLogIds = timeLogs.map(log => log._id);
            await existingPayment.save();
          }

          payrollResults.push({
            employeeId: employee._id,
            employeeName: employee.name,
            paymentId: existingPayment._id,
            regularHours: totalRegularHours,
            bonusHours: totalBonusHours,
            regularPay,
            bonusPay,
            totalPay,
            timeLogCount: timeLogs.length,
            status: 'existing'
          });
        }
      }
    }

    return {
      companyId,
      companyName: company.name,
      period: { startDate, endDate },
      totalEmployees: employees.length,
      employeesWithPayments: payrollResults.length,
      totalAmount: payrollResults.reduce((sum, result) => sum + result.totalPay, 0),
      results: payrollResults
    };
  } catch (error) {
    console.error('Calculate payroll error:', error);
    throw error;
  }
};

// Process payroll for a company based on payment cycle
const processPayroll = async (companyId) => {
  try {
    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    const now = new Date();
    let startDate, endDate;

    switch (company.paymentCycle) {
      case 'daily':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setHours(23, 59, 59, 999);
        break;

      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(now);
        break;

      case 'monthly':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(0); // Last day of previous month
        endDate.setHours(23, 59, 59, 999);
        break;

      default:
        throw new Error('Invalid payment cycle');
    }

    return await calculatePayroll(companyId, startDate, endDate);
  } catch (error) {
    console.error('Process payroll error:', error);
    throw error;
  }
};

// Get payroll summary for a company
const getPayrollSummary = async (companyId, period) => {
  try {
    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    const employees = await Employee.find({ 
      companyId: companyId, 
      isActive: true 
    });

    const summary = {
      companyId,
      companyName: company.name,
      totalEmployees: employees.length,
      period,
      totalPayments: 0,
      totalAmount: 0,
      pendingPayments: 0,
      completedPayments: 0,
      failedPayments: 0
    };

    // Get payment statistics
    const payments = await Payment.find({
      employeeId: { $in: employees.map(emp => emp._id) },
      'period.startDate': { $gte: period.startDate },
      'period.endDate': { $lte: period.endDate }
    });

    summary.totalPayments = payments.length;
    summary.totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
    summary.pendingPayments = payments.filter(p => p.status === 'pending').length;
    summary.completedPayments = payments.filter(p => p.status === 'completed').length;
    summary.failedPayments = payments.filter(p => p.status === 'failed').length;

    return summary;
  } catch (error) {
    console.error('Get payroll summary error:', error);
    throw error;
  }
};

// Get pending payments for processing
const getPendingPayments = async (companyId) => {
  try {
    const employees = await Employee.find({ 
      companyId: companyId, 
      isActive: true 
    });

    const pendingPayments = await Payment.find({
      employeeId: { $in: employees.map(emp => emp._id) },
      status: 'pending'
    })
    .populate('employeeId', 'name hourlyRate')
    .sort({ createdAt: 1 });

    return pendingPayments;
  } catch (error) {
    console.error('Get pending payments error:', error);
    throw error;
  }
};

module.exports = {
  calculatePayroll,
  processPayroll,
  getPayrollSummary,
  getPendingPayments
};
