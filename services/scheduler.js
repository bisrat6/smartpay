const cron = require('node-cron');
const Company = require('../models/Company');
const payrollService = require('./payrollService');
const arifpayService = require('./arifpayService');

// Schedule payroll processing based on company payment cycles
const schedulePayrollProcessing = () => {
  console.log('Setting up payroll processing scheduler...');

  // Daily payroll processing - runs every midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily payroll processing...');
    await processPayrollForCycle('daily');
  }, {
    timezone: 'Africa/Addis_Ababa' // Ethiopian timezone
  });

  // Weekly payroll processing - runs every Sunday at midnight
  cron.schedule('0 0 * * 0', async () => {
    console.log('Running weekly payroll processing...');
    await processPayrollForCycle('weekly');
  }, {
    timezone: 'Africa/Addis_Ababa'
  });

  // Monthly payroll processing - runs on the 1st of every month at midnight
  cron.schedule('0 0 1 * *', async () => {
    console.log('Running monthly payroll processing...');
    await processPayrollForCycle('monthly');
  }, {
    timezone: 'Africa/Addis_Ababa'
  });

  console.log('Payroll processing scheduler configured successfully');
};

// Process payroll for a specific cycle
const processPayrollForCycle = async (cycle) => {
  try {
    // Get all companies with the specified payment cycle
    const companies = await Company.find({ 
      paymentCycle: cycle,
      isActive: true 
    });

    console.log(`Found ${companies.length} companies with ${cycle} payment cycle`);

    for (const company of companies) {
      try {
        console.log(`Processing payroll for company: ${company.name} (${company._id})`);

        // Calculate payroll for the company
        const payrollResult = await payrollService.processPayroll(company._id);
        
        console.log(`Payroll calculated for ${payrollResult.employeesWithPayments} employees, total amount: ${payrollResult.totalAmount}`);

        // Get pending payments
        const pendingPayments = await payrollService.getPendingPayments(company._id);
        
        if (pendingPayments.length > 0) {
          console.log(`Processing ${pendingPayments.length} pending payments for company: ${company.name}`);

          // Process payments with Arifpay
          const paymentResults = await arifpayService.processBulkPayments(
            pendingPayments.map(p => p._id.toString()),
            company.arifpayMerchantKey
          );

          // Log results
          const successful = paymentResults.filter(r => r.success);
          const failed = paymentResults.filter(r => !r.success);

          console.log(`Payment processing completed for ${company.name}:`);
          console.log(`- Successful: ${successful.length}`);
          console.log(`- Failed: ${failed.length}`);

          if (failed.length > 0) {
            console.log('Failed payments:', failed.map(f => ({ paymentId: f.paymentId, error: f.error })));
          }
        } else {
          console.log(`No pending payments found for company: ${company.name}`);
        }

      } catch (error) {
        console.error(`Error processing payroll for company ${company.name}:`, error.message);
        // Continue with other companies even if one fails
      }
    }

    console.log(`Payroll processing completed for ${cycle} cycle`);
  } catch (error) {
    console.error(`Error in ${cycle} payroll processing:`, error);
  }
};

// Schedule cleanup tasks
const scheduleCleanupTasks = () => {
  console.log('Setting up cleanup tasks...');

  // Clean up old failed payments (older than 30 days) - runs daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('Running cleanup tasks...');
    await cleanupOldFailedPayments();
  }, {
    timezone: 'Africa/Addis_Ababa'
  });

  console.log('Cleanup tasks scheduler configured successfully');
};

// Clean up old failed payments
const cleanupOldFailedPayments = async () => {
  try {
    const Payment = require('../models/Payment');
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await Payment.deleteMany({
      status: 'failed',
      retryCount: { $gte: 3 },
      createdAt: { $lt: thirtyDaysAgo }
    });

    console.log(`Cleaned up ${result.deletedCount} old failed payments`);
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
};

// Schedule health check tasks
const scheduleHealthChecks = () => {
  console.log('Setting up health check tasks...');

  // Check for stuck payments (processing for more than 24 hours) - runs every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('Running health checks...');
    await checkStuckPayments();
  }, {
    timezone: 'Africa/Addis_Ababa'
  });

  console.log('Health check tasks scheduler configured successfully');
};

// Check for stuck payments
const checkStuckPayments = async () => {
  try {
    const Payment = require('../models/Payment');
    
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const stuckPayments = await Payment.find({
      status: 'processing',
      updatedAt: { $lt: twentyFourHoursAgo }
    });

    if (stuckPayments.length > 0) {
      console.log(`Found ${stuckPayments.length} stuck payments, updating status to failed`);
      
      await Payment.updateMany(
        {
          _id: { $in: stuckPayments.map(p => p._id) }
        },
        {
          status: 'failed',
          failureReason: 'Payment stuck in processing state for more than 24 hours'
        }
      );
    }
  } catch (error) {
    console.error('Error during health check:', error);
  }
};

// Initialize all schedulers
const initializeSchedulers = () => {
  console.log('Initializing schedulers...');
  
  schedulePayrollProcessing();
  scheduleCleanupTasks();
  scheduleHealthChecks();
  
  console.log('All schedulers initialized successfully');
};

// Manual payroll processing (for testing or manual triggers)
const processManualPayroll = async (companyId, cycle) => {
  try {
    console.log(`Manual payroll processing for company: ${companyId}, cycle: ${cycle}`);
    
    const company = await Company.findById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    if (company.paymentCycle !== cycle) {
      throw new Error(`Company payment cycle (${company.paymentCycle}) does not match requested cycle (${cycle})`);
    }

    await processPayrollForCycle(cycle);
    
    return { success: true, message: 'Manual payroll processing completed' };
  } catch (error) {
    console.error('Manual payroll processing error:', error);
    throw error;
  }
};

module.exports = {
  initializeSchedulers,
  processManualPayroll,
  processPayrollForCycle
};
