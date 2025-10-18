const { validationResult } = require('express-validator');
const JobRole = require('../models/JobRole');
const Company = require('../models/Company');

// Create job role
const createJobRole = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, defaultRates } = req.body;

    // Get company for current employer
    const company = await Company.findOne({ employerId: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Create job role
    const jobRole = new JobRole({
      name,
      defaultRates,
      companyId: company._id
    });

    await jobRole.save();

    res.status(201).json({
      message: 'Job role created successfully',
      jobRole
    });
  } catch (error) {
    console.error('Create job role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get job roles for company
const getJobRoles = async (req, res) => {
  try {
    const company = await Company.findOne({ employerId: req.user._id });
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const jobRoles = await JobRole.find({ companyId: company._id })
      .sort({ createdAt: -1 });

    res.json({ jobRoles });
  } catch (error) {
    console.error('Get job roles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update job role
const updateJobRole = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, defaultRates } = req.body;

    const jobRole = await JobRole.findById(req.params.id).populate('companyId', 'employerId');
    if (!jobRole) {
      return res.status(404).json({ message: 'Job role not found' });
    }

    // Check if employer owns this job role
    if (jobRole.companyId.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update fields
    if (name) jobRole.name = name;
    if (defaultRates) jobRole.defaultRates = { ...jobRole.defaultRates, ...defaultRates };

    await jobRole.save();

    res.json({
      message: 'Job role updated successfully',
      jobRole
    });
  } catch (error) {
    console.error('Update job role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete job role
const deleteJobRole = async (req, res) => {
  try {
    const jobRole = await JobRole.findById(req.params.id).populate('companyId', 'employerId');
    if (!jobRole) {
      return res.status(404).json({ message: 'Job role not found' });
    }

    // Check if employer owns this job role
    if (jobRole.companyId.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await JobRole.findByIdAndDelete(req.params.id);

    res.json({ message: 'Job role deleted successfully' });
  } catch (error) {
    console.error('Delete job role error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createJobRole,
  getJobRoles,
  updateJobRole,
  deleteJobRole
};
