const mongoose = require('mongoose');

const timeLogSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  clockIn: {
    type: Date,
    required: true
  },
  clockOut: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > this.clockIn;
      },
      message: 'Clock out time must be after clock in time'
    }
  },
  duration: {
    type: Number, // in hours
    default: 0
  },
  regularHours: {
    type: Number,
    default: 0,
    min: 0
  },
  bonusHours: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  notes: {
    type: String,
    trim: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Calculate duration when clockOut is set
timeLogSchema.pre('save', function(next) {
  if (this.clockOut && this.clockIn) {
    this.duration = (this.clockOut - this.clockIn) / 3600000; // Convert ms to hours
    this.regularHours = Math.min(this.duration, 8);
    this.bonusHours = Math.max(0, this.duration - 8);
  }
  next();
});

// Index for efficient queries
timeLogSchema.index({ employeeId: 1, createdAt: -1 });
timeLogSchema.index({ companyId: 1, createdAt: -1 });
timeLogSchema.index({ status: 1 });

module.exports = mongoose.model('TimeLog', timeLogSchema);
