const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group ID is required']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [2, 'Description must be at least 2 characters'],
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  currency: {
    type: String,
    default: 'ETB',
    enum: ['ETB', 'USD']
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Payer is required']
  },
  date: {
    type: Date,
    default: Date.now
  },
  category: {
    type: String,
    enum: ['Food & Drink', 'Transport', 'Rent', 'Utilities', 'Shopping', 'Entertainment', 'Coffee Ceremony', 'Gift', 'Other'],
    default: 'Other'
  },
  splits: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    share: {
      type: Number,
      required: true,
      min: 0
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paidAt: Date,
    settlementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Settlement'
    }
  }],
  receipt: {
    url: String,
    publicId: String
  },
  notes: {
    type: String,
    maxlength: 500
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true
});

// Validate that split amounts sum to total amount
expenseSchema.pre('save', function(next) {
  if (this.splits && this.splits.length > 0) {
    const totalShare = this.splits.reduce((sum, split) => sum + split.share, 0);
    
    if (Math.abs(totalShare - this.amount) > 0.01) {
      next(new Error(`Split amounts (${totalShare}) do not sum to total amount (${this.amount})`));
    }
  }
  
  next();
});

// Method to mark a split as paid
expenseSchema.methods.markSplitAsPaid = async function(userId, settlementId) {
  const split = this.splits.find(s => s.userId.toString() === userId.toString());
  
  if (!split) {
    throw new Error('User not found in expense splits');
  }
  
  if (split.isPaid) {
    throw new Error('This expense has already been marked as paid');
  }
  
  split.isPaid = true;
  split.paidAt = new Date();
  split.settlementId = settlementId;
  
  await this.save();
  
  return split;
};

module.exports = mongoose.model('Expense', expenseSchema);