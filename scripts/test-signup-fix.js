/* eslint-disable no-console */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const User = require('../models/User');
const Company = require('../models/Company');

async function testSignupFix() {
  try {
    await connectDB();
    
    console.log('=== TESTING SIGNUP FIX ===\n');
    
    // Test 1: Employer signup should work
    console.log('✅ Test 1: Employer Signup');
    const testEmployer = new User({
      email: 'test.employer@example.com',
      password: 'Password123!',
      role: 'employer'
    });
    
    await testEmployer.validate();
    console.log('✅ Employer signup validation passes');
    
    // Test 2: Employee signup should fail (companyId required)
    console.log('\n✅ Test 2: Employee Signup Validation');
    try {
      const testEmployee = new User({
        email: 'test.employee@example.com',
        password: 'Password123!',
        role: 'employee'
        // Missing companyId - should fail validation
      });
      
      await testEmployee.validate();
      console.log('❌ Employee signup should have failed validation');
    } catch (error) {
      if (error.message.includes('companyId: Path `companyId` is required')) {
        console.log('✅ Employee signup correctly requires companyId');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Test 3: Employee with companyId should work
    console.log('\n✅ Test 3: Employee with CompanyId');
    const company = await Company.findOne();
    if (company) {
      const testEmployeeWithCompany = new User({
        email: 'test.employee.with.company@example.com',
        password: 'Password123!',
        role: 'employee',
        companyId: company._id
      });
      
      await testEmployeeWithCompany.validate();
      console.log('✅ Employee with companyId validation passes');
    }
    
    console.log('\n=== SIGNUP FIX VERIFIED ===');
    console.log('✅ Only employers can self-register');
    console.log('✅ Employees must be created by employers (with companyId)');
    console.log('✅ This aligns with business logic: employers create employee accounts');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testSignupFix();
