const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  employerName: {
    type: String,
    required: true,
    trim: true
  },
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentCycle: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    default: 'monthly'
  },
  bonusRateMultiplier: {
    type: Number,
    default: 1.5,
    min: 1.0
  },
  maxDailyHours: {
    type: Number,
    default: 8,
    min: 1,
    max: 24
  },
  arifpayMerchantKey: {
    type: String,
    required: true,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Ensure one company per employer
companySchema.index({ employerId: 1 }, { unique: true });

module.exports = mongoose.model('Company', companySchema);
