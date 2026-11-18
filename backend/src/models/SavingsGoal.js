const mongoose = require('mongoose');

const savingsGoalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Savings goal title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be at least 1'],
    },
    currentAmount: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'ETB',
    },
    targetDate: {
      type: Date,
      default: null,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    category: {
      type: String,
      default: 'Emergency Fund',
    },
    icon: {
      type: String,
      default: 'piggy-bank',
    },
    color: {
      type: String,
      default: '#2E7D32',
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    history: [
      {
        type: {
          type: String,
          enum: ['deposit', 'withdraw'],
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
        note: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

savingsGoalSchema.index({ userId: 1, isCompleted: 1 });

module.exports = mongoose.model('SavingsGoal', savingsGoalSchema);
