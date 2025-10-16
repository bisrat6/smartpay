/* eslint-disable no-console */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User = require('../models/User');
const Company = require('../models/Company');
const Employee = require('../models/Employee');
const TimeLog = require('../models/TimeLog');
const Payment = require('../models/Payment');

async function clearAll() {
  try {
    await connectDB();
    console.log('Clearing all collections...');
    await Promise.all([
      User.deleteMany({}),
      Company.deleteMany({}),
      Employee.deleteMany({}),
      TimeLog.deleteMany({}),
      Payment.deleteMany({})
    ]);
    console.log('Database cleared successfully.');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Clear failed:', err);
    process.exit(1);
  }
}

clearAll();


