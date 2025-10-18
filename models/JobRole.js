const mongoose = require('mongoose');

const jobRoleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  defaultRates: {
    base: {
      type: Number,
      required: true,
      min: 0
    },
    overtime: {
      type: Number,
      required: true,
      min: 0
    },
    roleBonus: {
      type: Number,
      required: true,
      min: 0
    }
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('JobRole', jobRoleSchema);
