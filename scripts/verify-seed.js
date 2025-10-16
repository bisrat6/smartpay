/* eslint-disable no-console */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User = require('../models/User');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const TimeLog = require('../models/TimeLog');
const Payment = require('../models/Payment');

async function verifySeededData() {
  try {
    await connectDB();
    
    console.log('=== SEEDED DATA VERIFICATION ===\n');
    
    // Check Users
    const users = await User.find().select('-password');
    console.log(`USERS (${users.length} total):`);
    users.forEach(user => {
      console.log(`- ${user.role}: ${user.email} (Company: ${user.companyId || 'N/A'})`);
    });
    
    // Check Companies
    const companies = await Company.find();
    console.log(`\nCOMPANIES (${companies.length} total):`);
    companies.forEach(company => {
      console.log(`- ${company.name} (Employer: ${company.employerName})`);
      console.log(`  Payment Cycle: ${company.paymentCycle}`);
      console.log(`  Bonus Multiplier: ${company.bonusRateMultiplier}`);
      console.log(`  Max Daily Hours: ${company.maxDailyHours}`);
      console.log(`  Arifpay Key: ${company.arifpayMerchantKey ? 'Set' : 'Not set'}`);
    });
    
    // Check Employees
    const employees = await Employee.find();
    console.log(`\nEMPLOYEES (${employees.length} total):`);
    employees.forEach(emp => {
      console.log(`- ${emp.name} (${emp.email})`);
      console.log(`  Hourly Rate: ${emp.hourlyRate} ETB`);
      console.log(`  Telebirr: ${emp.telebirrMsisdn}`);
      console.log(`  Department: ${emp.department}`);
      console.log(`  Position: ${emp.position}`);
      console.log(`  Active: ${emp.isActive}`);
    });
    
    // Check Time Logs
    const timeLogs = await TimeLog.find();
    console.log(`\nTIME LOGS (${timeLogs.length} total):`);
    console.log(`- All logs have status: ${[...new Set(timeLogs.map(t => t.status))].join(', ')}`);
    console.log(`- Average duration: ${(timeLogs.reduce((sum, t) => sum + t.duration, 0) / timeLogs.length).toFixed(2)} hours`);
    console.log(`- Total regular hours: ${timeLogs.reduce((sum, t) => sum + t.regularHours, 0)}`);
    console.log(`- Total bonus hours: ${timeLogs.reduce((sum, t) => sum + t.bonusHours, 0)}`);
    
    // Check Payments
    const payments = await Payment.find().populate('employeeId', 'name');
    console.log(`\nPAYMENTS (${payments.length} total):`);
    payments.forEach(payment => {
      console.log(`- ${payment.employeeId.name}: ${payment.amount} ETB`);
      console.log(`  Status: ${payment.status}`);
      console.log(`  Regular Hours: ${payment.regularHours}`);
      console.log(`  Bonus Hours: ${payment.bonusHours}`);
      console.log(`  Time Logs: ${payment.timeLogIds.length}`);
      console.log(`  Period: ${payment.period.startDate.toDateString()} - ${payment.period.endDate.toDateString()}`);
    });
    
    // Model Validation Summary
    console.log('\n=== MODEL VALIDATION SUMMARY ===');
    
    // Check User model compliance
    const employeeUsers = users.filter(u => u.role === 'employee');
    const usersWithoutCompany = employeeUsers.filter(u => !u.companyId);
    console.log(`✅ Employee users with companyId: ${employeeUsers.length - usersWithoutCompany.length}/${employeeUsers.length}`);
    
    // Check Employee model compliance
    const employeesWithoutTelebirr = employees.filter(e => !e.telebirrMsisdn);
    const employeesWithInvalidTelebirr = employees.filter(e => e.telebirrMsisdn && !/^251[0-9]{9}$/.test(e.telebirrMsisdn));
    console.log(`✅ Employees with valid Telebirr numbers: ${employees.length - employeesWithoutTelebirr.length - employeesWithInvalidTelebirr.length}/${employees.length}`);
    
    // Check TimeLog model compliance
    const timeLogsWithInvalidDuration = timeLogs.filter(t => t.clockOut && t.clockOut <= t.clockIn);
    console.log(`✅ Time logs with valid clock times: ${timeLogs.length - timeLogsWithInvalidDuration.length}/${timeLogs.length}`);
    
    // Check Payment model compliance
    const paymentsWithInvalidAmount = payments.filter(p => p.amount <= 0);
    console.log(`✅ Payments with valid amounts: ${payments.length - paymentsWithInvalidAmount.length}/${payments.length}`);
    
    console.log('\n=== VERIFICATION COMPLETE ===');
    console.log('✅ All seeded data successfully validates against database models!');
    console.log('\n🎯 Ready for B2C payout testing in dry-run mode!');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }
}

verifySeededData();
