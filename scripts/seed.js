/* eslint-disable no-console */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User = require('../models/User');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const TimeLog = require('../models/TimeLog');
const Payment = require('../models/Payment');

async function seed() {
  try {
    await connectDB();

    console.log('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Company.deleteMany({}),
      Employee.deleteMany({}),
      TimeLog.deleteMany({}),
      Payment.deleteMany({})
    ]);

    console.log('Creating employer user and company...');
    const employer = await User.create({
      email: 'employer1@example.com',
      password: 'Password123!', // User pre-save hook will hash once
      role: 'employer'
    });

    const company = await Company.create({
      name: 'Acme Corp',
      employerName: 'John Doe',
      employerId: employer._id,
      paymentCycle: 'monthly',
      bonusRateMultiplier: 1.5,
      maxDailyHours: 8,
      arifpayMerchantKey: process.env.ARIFPAY_MERCHANT_KEY || 'demo_key'
    });

    console.log('Creating employee users and records...');
    const employeesData = [
      { email: 'employee1@example.com', name: 'Alice Worker', hourlyRate: 10 },
      { email: 'employee2@example.com', name: 'Bob Helper', hourlyRate: 12 },
      { email: 'employee3@example.com', name: 'Charlie Maker', hourlyRate: 9 }
    ];

    const employeeUsers = await Promise.all(
      employeesData.map((e) =>
        User.create({ email: e.email, password: 'Password123!', role: 'employee', companyId: company._id })
      )
    );

    const employees = await Promise.all(
      employeeUsers.map((user, idx) =>
        Employee.create({
          userId: user._id,
          companyId: company._id,
          name: employeesData[idx].name,
          hourlyRate: employeesData[idx].hourlyRate,
          department: 'Operations',
          position: 'Associate',
          employeeId: `EMP${idx + 1}`
        })
      )
    );

    console.log('Creating time logs for the past 5 days...');
    const now = new Date();
    const logsToInsert = [];
    for (let dayOffset = 1; dayOffset <= 5; dayOffset += 1) {
      for (const emp of employees) {
        const date = new Date(now);
        date.setDate(now.getDate() - dayOffset);
        const clockIn = new Date(date.setHours(9, 0, 0, 0));
        const clockOut = new Date(new Date(clockIn).setHours(clockIn.getHours() + 9)); // 9 hours

        logsToInsert.push({
          employeeId: emp._id,
          clockIn,
          clockOut,
          status: 'approved'
        });
      }
    }

    const createdLogs = await TimeLog.insertMany(logsToInsert);
    // Trigger duration/regular/bonus via manual recompute since pre-save doesn't run on insertMany without hooks
    for (const log of createdLogs) {
      log.duration = (log.clockOut - log.clockIn) / 3600000;
      log.regularHours = Math.min(log.duration, 8);
      log.bonusHours = Math.max(0, log.duration - 8);
      await log.save();
    }

    console.log('Creating payments from time logs via simple aggregation...');
    for (const emp of employees) {
      const empLogs = await TimeLog.find({ employeeId: emp._id, status: 'approved' });
      const regular = empLogs.reduce((s, l) => s + l.regularHours, 0);
      const bonus = empLogs.reduce((s, l) => s + l.bonusHours, 0);
      const amount = regular * emp.hourlyRate + bonus * emp.hourlyRate * company.bonusRateMultiplier;
      if (empLogs.length > 0) {
        await Payment.create({
          employeeId: emp._id,
          amount,
          period: {
            startDate: new Date(new Date().setDate(new Date().getDate() - 6)),
            endDate: new Date()
          },
          status: 'pending',
          regularHours: regular,
          bonusHours: bonus,
          hourlyRate: emp.hourlyRate,
          bonusRateMultiplier: company.bonusRateMultiplier,
          timeLogIds: empLogs.map((l) => l._id)
        });
      }
    }

    console.log('Seed completed successfully.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seed();


