const mongoose = require('mongoose');

const plannedExpenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    currency: {
      type: String,
      default: 'ETB',
    },
    category: {
      type: String,
      default: 'Utilities',
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    recurrence: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'],
      default: 'none',
    },
    reminderDaysBefore: {
      type: Number,
      default: 2,
    },
    isPaid: {
      type: Boolean,
      default: false,
      index: true,
    },
    paidDate: {
      type: Date,
      default: null,
    },
    paidTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
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

plannedExpenseSchema.index({ userId: 1, isPaid: 1, dueDate: 1 });

module.exports = mongoose.model('PlannedExpense', plannedExpenseSchema);
