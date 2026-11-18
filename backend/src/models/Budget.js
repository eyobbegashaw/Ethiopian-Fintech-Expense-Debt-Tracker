const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Budget name is required'],
      trim: true,
      maxlength: [100, 'Budget name cannot exceed 100 characters'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      default: 'All Categories',
    },
    amount: {
      type: Number,
      required: [true, 'Budget amount is required'],
      min: [1, 'Budget amount must be at least 1'],
    },
    currency: {
      type: String,
      default: 'ETB',
    },
    period: {
      type: String,
      enum: ['weekly', 'monthly', 'yearly'],
      default: 'monthly',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
    },
    alertThresholds: {
      fiftyPercentNotified: { type: Boolean, default: false },
      eightyPercentNotified: { type: Boolean, default: false },
      hundredPercentNotified: { type: Boolean, default: false },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

budgetSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Budget', budgetSchema);
