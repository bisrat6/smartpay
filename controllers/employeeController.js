const { validationResult } = require("express-validator");
const Employee = require("../models/Employee");
const User = require("../models/User");
const Company = require("../models/Company");
const { sendEmployeeWelcomePassword } = require("../services/emailService");

// Add new employee
const addEmployee = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, name, hourlyRate, department, position, telebirrMsisdn, phoneNumber, address } = req.body;

    // Get company for current employer
    const company = await Company.findOne({ employerId: req.user._id });
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Find or create the user for this email
    let user = await User.findOne({ email });
    let tempPassword;
    let isNewUser = false;
    if (!user) {
      // Create user account for employee with a randomly generated password
      tempPassword = Math.random().toString(36).slice(-10);
      console.log("Temporary password for new employee:", tempPassword);
      user = new User({
        email,
        password: tempPassword, // pre-save hook hashes once
        role: "employee",
      });
      await user.save();
      isNewUser = true;
    }

    // Prevent duplicates within the same company (by email or userId)
    const existingInCompany = await Employee.findOne({ $or: [ { email }, { userId: user._id } ], companyId: company._id });
    if (existingInCompany) {
      return res.status(400).json({ message: "Employee already exists in this company" });
    }

    // Create employee record
    const employee = new Employee({
      userId: user._id,
      companyId: company._id,
      name,
      email,
      hourlyRate,
      department,
      position,
      telebirrMsisdn,
      phoneNumber,
      address,
      isActive: true
    });

    await employee.save();

    // Only send password email if this is a brand-new user
    if (isNewUser && tempPassword) {
      try {
        await sendEmployeeWelcomePassword({ to: email, name, password: tempPassword });
      } catch (mailErr) {
        console.error("Failed to send welcome password email:", mailErr.message);
      }
    }

    // Note: the generated password is emailed to the employee; it is not returned in the API response.
    res.status(201).json({
      message: "Employee added successfully",
      employee: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        hourlyRate: employee.hourlyRate,
        department: employee.department,
        position: employee.position,
        telebirrMsisdn: employee.telebirrMsisdn,
        phoneNumber: employee.phoneNumber,
        address: employee.address,
        isActive: employee.isActive,
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

    const { name, hourlyRate, department, position, isActive, telebirrMsisdn, phoneNumber, address, email } = req.body;

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
    if (email) employee.email = email;
    if (hourlyRate !== undefined) employee.hourlyRate = hourlyRate;
    if (department !== undefined) employee.department = department;
    if (position !== undefined) employee.position = position;
    if (isActive !== undefined) employee.isActive = isActive;
    if (telebirrMsisdn !== undefined) employee.telebirrMsisdn = telebirrMsisdn;
    if (phoneNumber !== undefined) employee.phoneNumber = phoneNumber;
    if (address !== undefined) employee.address = address;

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
    await Employee.findByIdAndUpdate(employee._id, { isActive: false });

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
