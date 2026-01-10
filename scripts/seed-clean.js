/* eslint-disable no-console */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User = require('../models/User');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const JobRole = require('../models/JobRole');
const TimeLog = require('../models/TimeLog');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const { getPlan } = require('../config/subscriptionPlans');

async function seedClean() {
  try {
    await connectDB();

    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Company.deleteMany({}),
      Employee.deleteMany({}),
      JobRole.deleteMany({}),
      TimeLog.deleteMany({}),
      Payment.deleteMany({}),
      Subscription.deleteMany({})
    ]);

    console.log('Creating employer user and company...');
    const employer = await User.create({
      email: 'employer1@example.com',
      password: 'Password123!',
      role: 'employer'
    });

    const company = await Company.create({
      name: 'Acme Corp',
      employerName: 'John Doe',
      employerId: employer._id,
      paymentCycle: 'weekly', // Set to weekly from the start
      bonusRateMultiplier: 1.5,
      maxDailyHours: 8,
      arifpayMerchantKey: process.env.ARIFPAY_MERCHANT_KEY || 'demo_key',
      verificationStatus: 'pending',
      isActive: true,
      onboardingCompleted: false,
      size: '1-10'
    });

    // Create subscription for the company (matching API flow)
    console.log('Creating subscription for company...');
    const planConfig = getPlan('free');
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + planConfig.trialDays);
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const subscription = await Subscription.create({
      companyId: company._id,
      plan: planConfig.id,
      status: planConfig.trialDays > 0 ? 'trial' : 'active',
      limits: {
        maxEmployees: planConfig.maxEmployees,
        maxMonthlyPayments: planConfig.maxMonthlyPayments,
        features: planConfig.features
      },
      pricing: {
        amount: planConfig.price === 'custom' ? 0 : planConfig.price,
        currency: planConfig.currency,
        billingCycle: planConfig.billingCycle
      },
      currentPeriod: {
        start: now,
        end: periodEnd
      },
      trialEndsAt: planConfig.trialDays > 0 ? trialEnd : null
    });

    // Update company with subscription reference
    company.subscriptionId = subscription._id;
    await company.save();

    console.log('Creating job roles...');
    const jobRolesData = [
      { 
        name: 'Software Developer', 
        companyId: company._id,
        defaultRates: { base: 25, overtime: 37.5, roleBonus: 100 }
      },
      { 
        name: 'Sales Associate', 
        companyId: company._id,
        defaultRates: { base: 15, overtime: 22.5, roleBonus: 50 }
      },
      { 
        name: 'Manager', 
        companyId: company._id,
        defaultRates: { base: 35, overtime: 52.5, roleBonus: 200 }
      }
    ];

    const jobRoles = await JobRole.insertMany(jobRolesData);

    console.log('Creating employee users and records...');
    const employeesData = [
      { 
        email: 'employee1@example.com', 
        name: 'Alice Worker', 
        jobRoleId: jobRoles[0]._id,
        telebirrMsisdn: '251912345678'
      },
      { 
        email: 'employee2@example.com', 
        name: 'Bob Helper', 
        jobRoleId: jobRoles[1]._id,
        telebirrMsisdn: '251923456789'
      },
      { 
        email: 'employee3@example.com', 
        name: 'Charlie Maker', 
        jobRoleId: jobRoles[2]._id,
        telebirrMsisdn: '251934567890'
      }
    ];

    const employeeUsers = [];
    const employees = [];

    for (const empData of employeesData) {
      const user = await User.create({
        email: empData.email,
        password: 'Password123!',
        role: 'employee',
        companyId: company._id
      });
      employeeUsers.push(user);

      const jobRole = await JobRole.findById(empData.jobRoleId);
      
      const employee = await Employee.create({
        userId: user._id,
        companyId: company._id,
        name: empData.name,
        email: empData.email,
        jobRoleId: empData.jobRoleId,
        hourlyRate: jobRole.defaultRates.base,
        position: jobRole.name,
        telebirrMsisdn: empData.telebirrMsisdn,
        isActive: true
      });
      employees.push(employee);
    }

    console.log('Creating time logs for the past 5 days...');
    const logsToInsert = [];
    
    // Create time logs - all start as pending, then some get approved
    // Never create logs as 'paid' directly - they only become paid when payment completes
    for (let dayOffset = 1; dayOffset <= 5; dayOffset += 1) {
      for (const emp of employees) {
        const date = new Date(now);
        date.setDate(now.getDate() - dayOffset);
        const clockIn = new Date(date.setHours(9, 0, 0, 0));
        const clockOut = new Date(new Date(clockIn).setHours(clockIn.getHours() + 8 + Math.random() * 2));

        // Determine if this log should be approved (based on day offset)
        // Days 1-3: approved (ready for payment)
        // Days 4-5: pending (still needs approval)
        const shouldApprove = dayOffset <= 3;

        // Add some break data to demonstrate the feature (for some logs)
        const breaks = [];
        if (dayOffset <= 2 && Math.random() > 0.5) {
          // Add a lunch break for some logs
          const breakStart = new Date(clockIn);
          breakStart.setHours(12, 0, 0, 0);
          const breakEnd = new Date(breakStart);
          breakEnd.setHours(13, 0, 0, 0);
          breaks.push({
            startTime: breakStart,
            endTime: breakEnd,
            type: 'lunch'
          });
        }

        logsToInsert.push({
          employeeId: emp._id,
          companyId: company._id,
          clockIn,
          clockOut,
          status: shouldApprove ? 'approved' : 'pending',
          breaks: breaks,
          approvedBy: shouldApprove ? employer._id : undefined,
          approvedAt: shouldApprove ? new Date(date.getTime() + 24 * 60 * 60 * 1000) : undefined
        });
      }
    }

    // Insert logs and let pre-save hook calculate duration/regularHours/bonusHours
    const createdLogs = await TimeLog.insertMany(logsToInsert);
    // Save each log individually to trigger pre-save hook for calculations
    for (const log of createdLogs) {
      await log.save(); // Pre-save hook will calculate duration, regularHours, bonusHours, totalBreakTime
    }

    console.log('Creating payments from approved time logs...');
    
    // Create payments for approved time logs following proper workflow
    const allPayments = [];
    for (const emp of employees) {
      // Get approved time logs for this employee
      const approvedLogs = await TimeLog.find({ 
        employeeId: emp._id, 
        status: 'approved' 
      });
      
      if (approvedLogs.length > 0) {
        // Group logs by day to create daily payments
        const logsByDay = {};
        approvedLogs.forEach(log => {
          const dayKey = log.clockIn.toDateString();
          if (!logsByDay[dayKey]) {
            logsByDay[dayKey] = [];
          }
          logsByDay[dayKey].push(log);
        });

        // Create a payment for each day
        for (const [dayKey, dayLogs] of Object.entries(logsByDay)) {
          const logDate = new Date(dayKey);
          const startDate = new Date(logDate);
          startDate.setHours(0, 0, 0, 0);
          const endDate = new Date(logDate);
          endDate.setHours(23, 59, 59, 999);

          // Calculate payment amounts
          const totalRegularHours = dayLogs.reduce((sum, log) => sum + log.regularHours, 0);
          const totalBonusHours = dayLogs.reduce((sum, log) => sum + log.bonusHours, 0);
          
          // Get employee with job role for proper rate calculation
          const employeeWithRole = await Employee.findById(emp._id).populate('jobRoleId');
          let baseRate = employeeWithRole.hourlyRate ?? 0;
          let overtimeRate = 0;
          let roleBonus = 0;

          if (employeeWithRole.jobRoleId && employeeWithRole.jobRoleId.defaultRates) {
            baseRate = employeeWithRole.jobRoleId.defaultRates.base ?? baseRate;
            overtimeRate = employeeWithRole.jobRoleId.defaultRates.overtime ?? 0;
            roleBonus = employeeWithRole.jobRoleId.defaultRates.roleBonus ?? 0;
          }

          const regularPay = totalRegularHours * baseRate;
          const bonusPay = (totalBonusHours * overtimeRate) + roleBonus;
          const totalPay = regularPay + bonusPay;

          // Determine payment status based on day offset to show different workflow states
          // Days 1: completed (oldest, already processed)
          // Days 2: processing (in progress)
          // Days 3: approved (ready to process)
          // Note: We'll create all as pending first, then update some
          const dayOffset = Math.floor((now - logDate) / (1000 * 60 * 60 * 24));
          let paymentStatus = 'pending';
          let approvedBy = undefined;
          let approvedAt = undefined;
          let arifpaySessionId = undefined;
          let arifpayTransactionId = undefined;
          let paymentDate = undefined;

          if (dayOffset === 1) {
            // Completed payments (oldest day)
            paymentStatus = 'completed';
            approvedBy = employer._id;
            approvedAt = new Date(logDate.getTime() + 24 * 60 * 60 * 1000);
            arifpayTransactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            paymentDate = new Date(logDate.getTime() + 2 * 24 * 60 * 60 * 1000);
          } else if (dayOffset === 2) {
            // Processing payments
            paymentStatus = 'processing';
            approvedBy = employer._id;
            approvedAt = new Date(logDate.getTime() + 24 * 60 * 60 * 1000);
            arifpaySessionId = `SESSION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          } else if (dayOffset === 3) {
            // Approved payments (ready to process)
            paymentStatus = 'approved';
            approvedBy = employer._id;
            approvedAt = new Date(logDate.getTime() + 24 * 60 * 60 * 1000);
          }
          // dayOffset > 3 stays as 'pending'

          const payment = await Payment.create({
            employeeId: emp._id,
            amount: totalPay,
            period: {
              startDate,
              endDate
            },
            status: paymentStatus,
            regularHours: totalRegularHours,
            bonusHours: totalBonusHours,
            hourlyRate: baseRate,
            bonusRateMultiplier: company.bonusRateMultiplier,
            timeLogIds: dayLogs.map(log => log._id),
            approvedBy,
            approvedAt,
            arifpaySessionId,
            arifpayTransactionId,
            paymentDate
          });
          
          allPayments.push({ payment, dayLogs, dayKey, employeeName: employeeWithRole.name });
          
          console.log(`Created ${paymentStatus} payment for ${employeeWithRole.name} on ${dayKey}: $${totalPay.toFixed(2)}`);
        }
      }
    }

    // Mark time logs as 'paid' only for completed payments (following correct workflow)
    console.log('Marking time logs as paid for completed payments...');
    for (const { payment, dayLogs } of allPayments) {
      if (payment.status === 'completed') {
        await TimeLog.updateMany(
          { _id: { $in: dayLogs.map(log => log._id) } },
          { status: 'paid' }
        );
        console.log(`Marked ${dayLogs.length} time logs as paid for payment ${payment._id}`);
      }
    }

    console.log('Seed completed successfully.');
    console.log('\n=== SEEDED DATA SUMMARY ===');
    console.log(`Users: ${await User.countDocuments()}`);
    console.log(`Companies: ${await Company.countDocuments()}`);
    console.log(`Job Roles: ${await JobRole.countDocuments()}`);
    console.log(`Employees: ${await Employee.countDocuments()}`);
    console.log(`Time Logs: ${await TimeLog.countDocuments()}`);
    console.log(`Payments: ${await Payment.countDocuments()}`);
    
    console.log('\n=== TIME LOG STATUS BREAKDOWN ===');
    console.log(`Pending: ${await TimeLog.countDocuments({ status: 'pending' })}`);
    console.log(`Approved: ${await TimeLog.countDocuments({ status: 'approved' })}`);
    console.log(`Paid: ${await TimeLog.countDocuments({ status: 'paid' })}`);
    
    console.log('\n=== PAYMENT STATUS BREAKDOWN ===');
    console.log(`Pending: ${await Payment.countDocuments({ status: 'pending' })}`);
    console.log(`Approved: ${await Payment.countDocuments({ status: 'approved' })}`);
    console.log(`Processing: ${await Payment.countDocuments({ status: 'processing' })}`);
    console.log(`Completed: ${await Payment.countDocuments({ status: 'completed' })}`);
    console.log(`Failed: ${await Payment.countDocuments({ status: 'failed' })}`);
    
    console.log('\n=== SUBSCRIPTION INFO ===');
    console.log(`Subscriptions: ${await Subscription.countDocuments()}`);
    
    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Employer: employer1@example.com / Password123!');
    console.log('Employee 1: employee1@example.com / Password123!');
    console.log('Employee 2: employee2@example.com / Password123!');
    console.log('Employee 3: employee3@example.com / Password123!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seedClean();
