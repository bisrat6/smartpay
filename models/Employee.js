const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  position: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  telebirrMsisdn: {
    type: String,
    trim: true,
    required: function() {
      // Required for active employees to receive B2C payouts
      return this.isActive === true;
    },
    validate: {
      validator: function(v) {
        if (!v) return true; // Will be caught by required if isActive
        // Ethiopian Telebirr format: 251XXXXXXXXX (as per Arifpay docs)
        return /^251[0-9]{9}$/.test(v);
      },
      message: 'Telebirr phone number must be in format: 251XXXXXXXXX (e.g., 251912345678)'
    }
  }
}, {
  timestamps: true
});

// Indexes for efficient queries and uniqueness constraints per company
employeeSchema.index({ companyId: 1 });
employeeSchema.index({ userId: 1 });
employeeSchema.index({ email: 1 });

// Ensure an employee (by user) is unique within a company, but can exist across companies
employeeSchema.index({ userId: 1, companyId: 1 }, { unique: true });

// Ensure the same email can be used in different companies, but only once per company
employeeSchema.index({ email: 1, companyId: 1 }, { unique: true });

module.exports = mongoose.model('Employee', employeeSchema);
