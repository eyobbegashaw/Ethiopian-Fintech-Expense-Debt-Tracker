const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    minlength: [2, 'Group name must be at least 2 characters'],
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  members: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    nickname: {
      type: String,
      trim: true,
      maxlength: 50
    },
    role: {
      type: String,
      enum: ['member', 'admin'],
      default: 'member'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['Household', 'Trip', 'Event', 'Coffee Ceremony', 'Iddir', 'Equb', 'Other'],
    default: 'Other'
  },
  simplifyDebts: {
    type: Boolean,
    default: true
  },
  icon: {
    type: String,
    default: '👥'
  },
  coverImage: String,
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for expenses
groupSchema.virtual('expenses', {
  ref: 'Expense',
  localField: '_id',
  foreignField: 'groupId'
});

// Virtual for settlements
groupSchema.virtual('settlements', {
  ref: 'Settlement',
  localField: '_id',
  foreignField: 'groupId'
});

// Method to get group balance for each member
groupSchema.methods.getBalances = async function() {
  const Expense = mongoose.model('Expense');
  const Settlement = mongoose.model('Settlement');
  
  const balances = {};
  
  // Initialize balances for all members
  this.members.forEach(member => {
    balances[member.userId.toString()] = 0;
  });
  
  // Calculate from expenses
  const expenses = await Expense.find({ groupId: this._id, isDeleted: false });
  
  for (const expense of expenses) {
    // The person who paid gets positive balance
    balances[expense.paidBy.toString()] = (balances[expense.paidBy.toString()] || 0) + expense.amount;
    
    // Each split creates negative balance for the debtor
    for (const split of expense.splits) {
      if (!split.isPaid) {
        balances[split.userId.toString()] = (balances[split.userId.toString()] || 0) - split.share;
      }
    }
  }
  
  // Adjust for settlements
  const settlements = await Settlement.find({ groupId: this._id });
  
  for (const settlement of settlements) {
    balances[settlement.fromUser.toString()] = (balances[settlement.fromUser.toString()] || 0) - settlement.amount;
    balances[settlement.toUser.toString()] = (balances[settlement.toUser.toString()] || 0) + settlement.amount;
  }
  
  // Round to 2 decimal places
  for (const userId in balances) {
    balances[userId] = Math.round(balances[userId] * 100) / 100;
  }
  
  return balances;
};

module.exports = mongoose.model('Group', groupSchema);