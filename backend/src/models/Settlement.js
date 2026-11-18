const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Payer is required'],
    index: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Receiver is required'],
    index: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  currency: {
    type: String,
    default: 'ETB'
  },
  date: {
    type: Date,
    default: Date.now
  },
  method: {
    type: String,
    enum: ['Cash', 'TeleBirr', 'CBE Birr', 'Amole', 'Bank Transfer', 'Other'],
    required: [true, 'Payment method is required']
  },
  transactionReference: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    maxlength: 500
  },
  relatedExpenses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense'
  }],
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'completed'
  },
  proofImage: {
    url: String,
    publicId: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

settlementSchema.index({ groupId: 1, createdAt: -1 });
settlementSchema.index({ fromUser: 1, toUser: 1 });

// Ensure fromUser and toUser are different
settlementSchema.pre('save', function() {
  if (this.fromUser && this.toUser && this.fromUser.toString() === this.toUser.toString()) {
    throw new Error('Cannot settle debt with yourself');
  }
});

module.exports = mongoose.model('Settlement', settlementSchema);
