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
  },
  breaks: [{
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      validate: {
        validator: function(value) {
          return !value || value > this.startTime;
        },
        message: 'Break end time must be after break start time'
      }
    },
    duration: {
      type: Number, // in hours
      default: 0
    },
    type: {
      type: String,
      enum: ['lunch', 'coffee', 'personal', 'other'],
      default: 'lunch'
    }
  }],
  totalBreakTime: {
    type: Number, // in hours
    default: 0
  }
}, {
  timestamps: true
});

// Calculate duration when clockOut is set
timeLogSchema.pre('save', function(next) {
  if (this.clockOut && this.clockIn) {
    // Calculate total break time
    this.totalBreakTime = this.breaks.reduce((total, breakItem) => {
      if (breakItem.endTime) {
        return total + ((breakItem.endTime - breakItem.startTime) / 3600000);
      }
      return total;
    }, 0);
    
    // Calculate work duration (total time minus breaks)
    this.duration = ((this.clockOut - this.clockIn) / 3600000) - this.totalBreakTime;
    this.regularHours = Math.min(this.duration, 8);
    this.bonusHours = Math.max(0, this.duration - 8);
  }
  
  // Calculate break durations
  this.breaks.forEach(breakItem => {
    if (breakItem.endTime) {
      breakItem.duration = (breakItem.endTime - breakItem.startTime) / 3600000;
    }
  });
  
  next();
});

// Index for efficient queries
timeLogSchema.index({ employeeId: 1, createdAt: -1 });
timeLogSchema.index({ companyId: 1, createdAt: -1 });
timeLogSchema.index({ status: 1 });

module.exports = mongoose.model('TimeLog', timeLogSchema);
