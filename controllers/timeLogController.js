const { validationResult } = require('express-validator');
const TimeLog = require('../models/TimeLog');
const Employee = require('../models/Employee');
const Company = require('../models/Company');

// Clock in
const clockIn = async (req, res) => {
  try {
    const { companyId: companyIdParam } = req.body;
    // If the user has multiple companies, require explicit companyId
    let employee;
    if (companyIdParam) {
      employee = await Employee.findOne({ userId: req.user._id, companyId: companyIdParam });
    } else {
      const employees = await Employee.find({ userId: req.user._id });
      if (employees.length > 1) {
        return res.status(400).json({ message: 'Multiple employments found. Please specify companyId.' });
      }
      employee = employees[0];
    }
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found' });
    }

    // Check if already clocked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingLog = await TimeLog.findOne({
      employeeId: employee._id,
      clockIn: { $gte: today, $lt: tomorrow },
      clockOut: { $exists: false }
    });

    if (existingLog) {
      return res.status(400).json({ message: 'Already clocked in today' });
    }

    // Create new time log
    const timeLog = new TimeLog({
      employeeId: employee._id,
      companyId: employee.companyId,
      clockIn: new Date()
    });

    await timeLog.save();

    res.status(201).json({
      message: 'Clocked in successfully',
      timeLog: {
        id: timeLog._id,
        clockIn: timeLog.clockIn,
        employeeId: timeLog.employeeId
      }
    });
  } catch (error) {
    console.error('Clock in error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Clock out
const clockOut = async (req, res) => {
  try {
    const { companyId: companyIdParam } = req.body;
    let employee;
    if (companyIdParam) {
      employee = await Employee.findOne({ userId: req.user._id, companyId: companyIdParam });
    } else {
      const employees = await Employee.find({ userId: req.user._id });
      if (employees.length > 1) {
        return res.status(400).json({ message: 'Multiple employments found. Please specify companyId.' });
      }
      employee = employees[0];
    }
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found' });
    }

    // Find today's active time log
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeLog = await TimeLog.findOne({
      employeeId: employee._id,
      clockIn: { $gte: today, $lt: tomorrow },
      clockOut: { $exists: false }
    });

    if (!timeLog) {
      return res.status(400).json({ message: 'No active clock in found for today' });
    }

    // Update clock out time
    timeLog.clockOut = new Date();
    
    // Duration will be calculated by the pre-save hook
    await timeLog.save();

    res.json({
      message: 'Clocked out successfully',
      timeLog: {
        id: timeLog._id,
        clockIn: timeLog.clockIn,
        clockOut: timeLog.clockOut,
        duration: timeLog.duration,
        regularHours: timeLog.regularHours,
        bonusHours: timeLog.bonusHours
      }
    });
  } catch (error) {
    console.error('Clock out error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get time logs for employee
const getTimeLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, companyId } = req.query;
    let employee;
    if (companyId) {
      employee = await Employee.findOne({ userId: req.user._id, companyId });
    } else {
      const employees = await Employee.find({ userId: req.user._id });
      if (employees.length > 1) {
        return res.status(400).json({ message: 'Multiple employments found. Please specify companyId.' });
      }
      employee = employees[0];
    }
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found' });
    }

    // Build query
    const query = { employeeId: employee._id };
    if (status) {
      query.status = status;
    }

    const timeLogs = await TimeLog.find(query)
      .sort({ clockIn: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('approvedBy', 'email');

    const total = await TimeLog.countDocuments(query);

    res.json({
      timeLogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get time logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get time logs for company (employer only)
const getCompanyTimeLogs = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, employeeId } = req.query;
    
    // Get company
    const company = await Company.findOne({ employerId: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Get employees for this company
    const employees = await Employee.find({ companyId: company._id });
    const employeeIds = employees.map(emp => emp._id);

    // Build query
    const query = { employeeId: { $in: employeeIds } };
    if (status) {
      query.status = status;
    }
    if (employeeId) {
      query.employeeId = employeeId;
    }

    const timeLogs = await TimeLog.find(query)
      .populate('employeeId', 'name hourlyRate')
      .populate('approvedBy', 'email')
      .sort({ clockIn: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await TimeLog.countDocuments(query);

    res.json({
      timeLogs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get company time logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve time log (employer only)
const approveTimeLog = async (req, res) => {
  try {
    const { status, notes } = req.body;

    const timeLog = await TimeLog.findById(req.params.id)
      .populate('employeeId', 'companyId');

    if (!timeLog) {
      return res.status(404).json({ message: 'Time log not found' });
    }

    // Check if employer owns this employee
    const company = await Company.findOne({ employerId: req.user._id });
    if (!company || timeLog.employeeId.companyId.toString() !== company._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update time log
    timeLog.status = status;
    timeLog.notes = notes;
    timeLog.approvedBy = req.user._id;
    timeLog.approvedAt = new Date();

    await timeLog.save();

    res.json({
      message: 'Time log updated successfully',
      timeLog
    });
  } catch (error) {
    console.error('Approve time log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get current clock status
const getClockStatus = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id });
    
    if (!employee) {
      return res.status(404).json({ message: 'Employee record not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activeLog = await TimeLog.findOne({
      employeeId: employee._id,
      clockIn: { $gte: today, $lt: tomorrow },
      clockOut: { $exists: false }
    });

    res.json({
      isClockedIn: !!activeLog,
      currentLog: activeLog ? {
        id: activeLog._id,
        clockIn: activeLog.clockIn,
        currentDuration: (new Date() - activeLog.clockIn) / 3600000
      } : null
    });
  } catch (error) {
    console.error('Get clock status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  clockIn,
  clockOut,
  getTimeLogs,
  getCompanyTimeLogs,
  approveTimeLog,
  getClockStatus
};
