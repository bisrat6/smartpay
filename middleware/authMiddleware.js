const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const employerOnly = (req, res, next) => {
  if (req.user.role !== 'employer') {
    return res.status(403).json({ message: 'Access denied. Employer role required.' });
  }
  next();
};

const employeeOnly = (req, res, next) => {
  if (req.user.role !== 'employee') {
    return res.status(403).json({ message: 'Access denied. Employee role required.' });
  }
  next();
};

const sameCompanyOrEmployer = async (req, res, next) => {
  try {
    if (req.user.role === 'employer') {
      return next();
    }

    // For employees, check if they belong to the same company
    const Employee = require('../models/Employee');
    const employee = await Employee.findOne({ userId: req.user._id });
    
    if (!employee) {
      return res.status(403).json({ message: 'Employee record not found' });
    }

    req.employee = employee;
    next();
  } catch (error) {
    console.error('Same company middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  authMiddleware,
  employerOnly,
  employeeOnly,
  sameCompanyOrEmployer
};
