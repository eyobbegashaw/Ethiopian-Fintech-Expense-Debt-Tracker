const mongoose = require('mongoose');

const friendRequestSchema = new mongoose.Schema({
  fromUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  toUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending'
  },
  message: {
    type: String,
    maxlength: 200
  }
}, {
  timestamps: true
});

// Ensure only one active pending request exists between two users
friendRequestSchema.index(
  { fromUser: 1, toUser: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'pending' },
    name: 'unique_pending_friend_request'
  }
);

friendRequestSchema.index({ toUser: 1, status: 1 });

module.exports = mongoose.model('FriendRequest', friendRequestSchema);
