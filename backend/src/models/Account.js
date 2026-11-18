const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      maxlength: [100, 'Account name cannot exceed 100 characters'],
    },
    type: {
      type: String,
      enum: ['cbe', 'telebirr', 'cbe_birr', 'amole', 'bank', 'cash', 'international', 'custom'],
      required: [true, 'Account type is required'],
    },
    institution: {
      type: String,
      default: 'Commercial Bank of Ethiopia',
      trim: true,
    },
    accountNumber: {
      type: String,
      trim: true,
      default: '',
    },
    initialBalance: {
      type: Number,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'ETB',
      enum: ['ETB', 'USD', 'EUR', 'GBP'],
    },
    color: {
      type: String,
      default: '#2E7D32',
    },
    icon: {
      type: String,
      default: 'bank',
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      maxlength: [300, 'Notes cannot exceed 300 characters'],
    },
  },
  {
    timestamps: true,
  }
);

accountSchema.index({ userId: 1, isArchived: 1 });

module.exports = mongoose.model('Account', accountSchema);
