const { validationResult } = require('express-validator');
const Company = require('../models/Company');

// Get company by ID
const getCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('employerId', 'email role')
      .select('-arifpayMerchantKey'); // Don't expose merchant key

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json({ company });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current user's company
const getMyCompany = async (req, res) => {
  try {
    const company = await Company.findOne({ employerId: req.user._id })
      .populate('employerId', 'email role');

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json({ company });
  } catch (error) {
    console.error('Get my company error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update company settings
const updateCompany = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, employerName, paymentCycle, bonusRateMultiplier, maxDailyHours, arifpayMerchantKey } = req.body;

    const company = await Company.findOne({ employerId: req.user._id });
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Update fields
    if (name) company.name = name;
    if (employerName) company.employerName = employerName;
    if (paymentCycle) company.paymentCycle = paymentCycle;
    if (bonusRateMultiplier !== undefined) company.bonusRateMultiplier = bonusRateMultiplier;
    if (maxDailyHours !== undefined) company.maxDailyHours = maxDailyHours;
    if (arifpayMerchantKey) company.arifpayMerchantKey = arifpayMerchantKey;

    await company.save();

    // Return updated company without sensitive data
    const updatedCompany = company.toObject();
    delete updatedCompany.arifpayMerchantKey;

    res.json({
      message: 'Company updated successfully',
      company: updatedCompany
    });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get company statistics
const getCompanyStats = async (req, res) => {
  try {
    const company = await Company.findOne({ employerId: req.user._id });
    
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Get employee count
    const Employee = require('../models/Employee');
    const employeeCount = await Employee.countDocuments({ 
      companyId: company._id, 
      isActive: true 
    });

    // Get pending time logs count
    const TimeLog = require('../models/TimeLog');
    const pendingTimeLogsCount = await TimeLog.countDocuments({
      employeeId: { $in: await Employee.find({ companyId: company._id }).distinct('_id') },
      status: 'pending'
    });

    // Get recent payments
    const Payment = require('../models/Payment');
    const recentPayments = await Payment.find({
      employeeId: { $in: await Employee.find({ companyId: company._id }).distinct('_id') }
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('employeeId', 'name hourlyRate');

    res.json({
      stats: {
        employeeCount,
        pendingTimeLogsCount,
        recentPayments
      }
    });
  } catch (error) {
    console.error('Get company stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCompany,
  getMyCompany,
  updateCompany,
  getCompanyStats
};
