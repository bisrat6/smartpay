const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ message: 'Server configuration error' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        console.error('Token expired:', jwtError.expiredAt);
        return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
      } else if (jwtError.name === 'JsonWebTokenError') {
        console.error('Invalid token:', jwtError.message);
        return res.status(401).json({ message: 'Invalid token', code: 'INVALID_TOKEN' });
      } else {
        console.error('JWT verification error:', jwtError);
        return res.status(401).json({ message: 'Token verification failed', code: 'TOKEN_VERIFICATION_FAILED' });
      }
    }

    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.error('User not found for userId:', decoded.userId);
      return res.status(401).json({ message: 'User not found', code: 'USER_NOT_FOUND' });
    }

    if (!user.isActive) {
      console.error('User account is inactive:', decoded.userId);
      return res.status(401).json({ message: 'Account is deactivated', code: 'ACCOUNT_DEACTIVATED' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication failed', code: 'AUTH_ERROR' });
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

const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ message: 'Access denied. Super admin privileges required.' });
  }
  next();
};

module.exports = {
  authMiddleware,
  employerOnly,
  employeeOnly,
  sameCompanyOrEmployer,
  superAdminOnly
};
