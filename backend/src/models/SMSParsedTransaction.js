const mongoose = require('mongoose');

const smsParsedTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    rawMessage: {
      type: String,
      required: [true, 'Raw SMS content is required'],
      trim: true,
    },
    sender: {
      type: String,
      default: 'Unknown',
      trim: true,
    },
    provider: {
      type: String,
      enum: ['telebirr', 'cbe_birr', 'cbe', 'amole', 'awash', 'other'],
      required: true,
    },
    type: {
      type: String,
      enum: ['income', 'expense', 'unknown'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'ETB',
    },
    referenceNumber: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    detectedBalance: {
      type: Number,
      default: null,
    },
    counterparty: {
      type: String,
      trim: true,
      default: '',
    },
    detectedCategory: {
      type: String,
      default: 'Other Expense',
    },
    matchedAccountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
    },
    status: {
      type: String,
      enum: ['unverified', 'confirmed', 'rejected'],
      default: 'unverified',
      index: true,
    },
    confirmedTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

smsParsedTransactionSchema.index({ userId: 1, referenceNumber: 1 });
smsParsedTransactionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('SMSParsedTransaction', smsParsedTransactionSchema);
