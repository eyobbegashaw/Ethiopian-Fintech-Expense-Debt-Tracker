const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const logger = require('../utils/logger');

// @desc    Send friend request
// @route   POST /api/v1/friends/request
// @access  Private
exports.sendFriendRequest = async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    // Find user by phone
    const friend = await User.findOne({ phone });
    if (!friend) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this phone number'
      });
    }
    
    if (friend._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send friend request to yourself'
      });
    }
    
    // Check if already friends
    if (req.user.friends.includes(friend._id)) {
      return res.status(400).json({
        success: false,
        message: 'Already friends with this user'
      });
    }
    
    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      fromUser: req.user.id,
      toUser: friend._id,
      status: 'pending'
    });
    
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Friend request already sent'
      });
    }
    
    // Create friend request
    const request = await FriendRequest.create({
      fromUser: req.user.id,
      toUser: friend._id,
      message
    });
    
    res.status(201).json({
      success: true,
      data: request
    });
    
    logger.info(`Friend request sent from ${req.user.id} to ${friend._id}`);
  } catch (error) {
    logger.error('Send friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending friend request'
    });
  }
};

// @desc    Accept friend request
// @route   PUT /api/v1/friends/request/:id/accept
// @access  Private
exports.acceptFriendRequest = async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }
    
    if (request.toUser.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this request'
      });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'This request has already been processed'
      });
    }
    
    // Update request status
    request.status = 'accepted';
    await request.save();
    
    // Add to friends lists
    await User.findByIdAndUpdate(request.fromUser, {
      $addToSet: { friends: request.toUser }
    });
    
    await User.findByIdAndUpdate(request.toUser, {
      $addToSet: { friends: request.fromUser }
    });
    
    res.json({
      success: true,
      message: 'Friend request accepted'
    });
    
    logger.info(`Friend request accepted between ${request.fromUser} and ${request.toUser}`);
  } catch (error) {
    logger.error('Accept friend request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error accepting friend request'
    });
  }
};

// @desc    Get friends list
// @route   GET /api/v1/friends
// @access  Private
exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends', 'name phone avatar');
    
    res.json({
      success: true,
      data: user.friends
    });
  } catch (error) {
    logger.error('Get friends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching friends'
    });
  }
};

// @desc    Get pending friend requests
// @route   GET /api/v1/friends/requests
// @access  Private
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      toUser: req.user.id,
      status: 'pending'
    }).populate('fromUser', 'name phone avatar');
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    logger.error('Get pending requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching requests'
    });
  }
};