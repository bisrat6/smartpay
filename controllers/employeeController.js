const { validationResult } = require("express-validator");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Company = require("../models/Company");

// Add new employee
const addEmployee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, name, hourlyRate, department, position } = req.body;

    // Get company for current employer
    const company = await Company.findOne({ employerId: req.user._id });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res
        .status(400)
        .json({ message: "User already exists with this email" });
    }

    // Create user account for employee with temp password and force change on first login
    const tempPassword = Math.random().toString(36).slice(-10);
    user = new User({
      email,
      password: tempPassword, // pre-save hook hashes once
      role: "employee",
      companyId: company._id,
      mustChangePassword: true,
    });

    await user.save();

    // Create employee record
    const employee = new Employee({
      userId: user._id,
      companyId: company._id,
      name,
      hourlyRate,
      department,
      position,
      employeeId: `EMP${Date.now()}`,
    });

    await employee.save();

    // Note: tempPassword should NOT be returned in production responses. It is generated
    // here for demo and should be sent to the employee through a secure channel (email/SMS)
    // or a secure onboarding flow. We intentionally do not include it in the API response.
    res.status(201).json({
      message: "Employee added successfully",
      employee: {
        id: employee._id,
        name: employee.name,
        email: user.email,
        hourlyRate: employee.hourlyRate,
        department: employee.department,
        position: employee.position,
        employeeId: employee.employeeId,
      },
    });
  } catch (error) {
    console.error("Add employee error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get employee by ID
const getEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id)
      .populate("userId", "email role isActive")
      .populate("companyId", "name");

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    res.json({ employee });
  } catch (error) {
    console.error("Get employee error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all employees for company
const getEmployees = async (req, res) => {
  try {
    const company = await Company.findOne({ employerId: req.user._id });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const employees = await Employee.find({ companyId: company._id })
      .populate("userId", "email isActive")
      .select("-__v")
      .sort({ createdAt: -1 });

    res.json({ employees });
  } catch (error) {
    console.error("Get employees error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update employee
const updateEmployee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, hourlyRate, department, position, status } = req.body;

    const employee = await Employee.findById(req.params.id).populate(
      "companyId",
      "employerId"
    );

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Check if employer owns this employee
    if (employee.companyId.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Update fields
    if (name) employee.name = name;
    if (hourlyRate !== undefined) employee.hourlyRate = hourlyRate;
    if (department !== undefined) employee.department = department;
    if (position !== undefined) employee.position = position;
    if (status) employee.status = status;

    await employee.save();

    res.json({
      message: "Employee updated successfully",
      employee,
    });
  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete employee (soft delete by deactivating)
const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate(
      "companyId",
      "employerId"
    );

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Check if employer owns this employee
    if (employee.companyId.employerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Soft delete - deactivate user and employee
    await User.findByIdAndUpdate(employee.userId, { isActive: false });
    await Employee.findByIdAndUpdate(employee._id, { status: "terminated" });

    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Delete employee error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get my employee profile (for employees)
const getMyProfile = async (req, res) => {
  try {
    const employee = await Employee.findOne({ userId: req.user._id }).populate(
      "companyId",
      "name employerName"
    );

    if (!employee) {
      return res.status(404).json({ message: "Employee profile not found" });
    }

    res.json({ employee });
  } catch (error) {
    console.error("Get my profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  addEmployee,
  getEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
  getMyProfile,
};
