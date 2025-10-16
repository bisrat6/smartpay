const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  period: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  arifpayTransactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  arifpaySessionId: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentDate: {
    type: Date
  },
  regularHours: {
    type: Number,
    required: true,
    min: 0
  },
  bonusHours: {
    type: Number,
    required: true,
    min: 0
  },
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  bonusRateMultiplier: {
    type: Number,
    required: true,
    min: 1
  },
  timeLogIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeLog'
  }],
  failureReason: {
    type: String,
    trim: true
  },
  retryCount: {
    type: Number,
    default: 0,
    max: 3
  }
}, {
  timestamps: true
});

// Index for efficient queries
paymentSchema.index({ employeeId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });

module.exports = mongoose.model('Payment', paymentSchema);
