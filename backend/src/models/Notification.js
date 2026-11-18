const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: [
      'expense',
      'settlement',
      'debt_reminder',
      'group_invite',
      'member_joined',
      'member_left',
      'group_created',
      'general'
    ],
    default: 'general'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  data: {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group'
    },
    groupName: String,
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense'
    },
    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Settlement'
    },
    amount: Number,
    currency: {
      type: String,
      default: 'ETB'
    },
    extra: mongoose.Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
