const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const DebtSimplifier = require('../services/debtSimplifier');
const logger = require('../utils/logger');

// @desc    Create a new group
// @route   POST /api/v1/groups
// @access  Private
exports.createGroup = async (req, res) => {
  try {
    const { name, description, category, icon, simplifyDebts } = req.body;
    
    const group = await Group.create({
      name,
      description,
      category,
      icon: icon || '👥',
      simplifyDebts: simplifyDebts !== undefined ? simplifyDebts : true,
      createdBy: req.user.id,
      members: [{
        userId: req.user.id,
        role: 'admin',
        joinedAt: new Date()
      }]
    });
    
    await group.populate('members.userId', 'name phone avatar');
    
    res.status(201).json({
      success: true,
      data: group
    });
    
    logger.info(`Group created: ${group.name} by ${req.user.id}`);
  } catch (error) {
    logger.error('Create group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating group'
    });
  }
};

// @desc    Get all groups for current user
// @route   GET /api/v1/groups
// @access  Private
exports.getGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      'members.userId': req.user.id,
      isArchived: false
    }).populate('members.userId', 'name phone avatar');
    
    // Calculate balances for each group
    const groupsWithBalances = await Promise.all(
      groups.map(async (group) => {
        const balances = await group.getBalances();
        const userBalance = balances[req.user.id.toString()] || 0;
        
        return {
          ...group.toJSON(),
          userBalance,
          memberCount: group.members.length
        };
      })
    );
    
    res.json({
      success: true,
      count: groupsWithBalances.length,
      data: groupsWithBalances
    });
  } catch (error) {
    logger.error('Get groups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching groups'
    });
  }
};

// @desc    Get single group with details
// @route   GET /api/v1/groups/:id
// @access  Private
exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('members.userId', 'name phone avatar')
      .populate('createdBy', 'name phone');
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user is member
    const isMember = group.members.some(
      member => member.userId._id.toString() === req.user.id
    );
    
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this group'
      });
    }
    
    // Get expenses
    const expenses = await Expense.find({ groupId: group._id, isDeleted: false })
      .populate('paidBy', 'name avatar')
      .populate('splits.userId', 'name avatar')
      .sort('-date')
      .limit(50);
    
    // Get settlements
    const settlements = await Settlement.find({ groupId: group._id })
      .populate('fromUser', 'name avatar')
      .populate('toUser', 'name avatar')
      .sort('-date')
      .limit(50);
    
    // Calculate balances
    const balances = await group.getBalances();
    const userBalance = balances[req.user.id.toString()] || 0;
    
    // Simplify debts if enabled
    let simplifiedDebts = [];
    if (group.simplifyDebts) {
      simplifiedDebts = DebtSimplifier.getSimplifiedDebts(
        expenses,
        settlements,
        group.members
      );
    }
    
    res.json({
      success: true,
      data: {
        group,
        expenses,
        settlements,
        balances,
        userBalance,
        simplifiedDebts
      }
    });
  } catch (error) {
    logger.error('Get group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching group'
    });
  }
};

// @desc    Add member to group
// @route   POST /api/v1/groups/:id/members
// @access  Private
exports.addMember = async (req, res) => {
  try {
    const { userId, nickname } = req.body;
    
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if current user is admin
    const currentMember = group.members.find(
      m => m.userId.toString() === req.user.id
    );
    
    if (!currentMember || currentMember.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only group admins can add members'
      });
    }
    
    // Check if user already in group
    const alreadyMember = group.members.some(
      m => m.userId.toString() === userId
    );
    
    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this group'
      });
    }
    
    // Add member
    group.members.push({
      userId,
      nickname,
      role: 'member',
      joinedAt: new Date()
    });
    
    await group.save();
    await group.populate('members.userId', 'name phone avatar');
    
    res.json({
      success: true,
      data: group
    });
    
    logger.info(`User ${userId} added to group ${group.name}`);
  } catch (error) {
    logger.error('Add member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding member'
    });
  }
};

// @desc    Leave group
// @route   DELETE /api/v1/groups/:id/leave
// @access  Private
exports.leaveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Check if user is member
    const memberIndex = group.members.findIndex(
      m => m.userId.toString() === req.user.id
    );
    
    if (memberIndex === -1) {
      return res.status(400).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }
    
    const currentMember = group.members[memberIndex];
    
    // Check if user has unsettled debts
    const balances = await group.getBalances();
    const userBalance = balances[req.user.id.toString()] || 0;
    
    if (Math.abs(userBalance) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Please settle all debts before leaving the group'
      });
    }
    
    // Remove member
    group.members.splice(memberIndex, 1);
    
    // If group becomes empty, delete it
    if (group.members.length === 0) {
      await Group.findByIdAndDelete(group._id);
      return res.json({
        success: true,
        message: 'Group deleted as it had no remaining members'
      });
    }
    
    // If admin leaves, assign new admin
    if (currentMember.role === 'admin' && group.members.length > 0) {
      group.members[0].role = 'admin';
    }
    
    await group.save();
    
    res.json({
      success: true,
      message: 'Successfully left the group'
    });
    
    logger.info(`User ${req.user.id} left group ${group.name}`);
  } catch (error) {
    logger.error('Leave group error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error leaving group'
    });
  }
};