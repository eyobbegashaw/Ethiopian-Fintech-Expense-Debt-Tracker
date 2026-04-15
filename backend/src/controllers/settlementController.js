const Settlement = require('../models/Settlement');
const Expense = require('../models/Expense');
const Group = require('../models/Group');
const User = require('../models/User');
const notificationService = require('../services/notificationService');
const PaymentLinkGenerator = require('../services/paymentLinkGenerator');
const logger = require('../utils/logger');

// @desc    Create a settlement
// @route   POST /api/v1/settlements
// @access  Private
exports.createSettlement = async (req, res) => {
  try {
    const {
      groupId,
      fromUser,
      toUser,
      amount,
      method,
      transactionReference,
      notes,
      relatedExpenses
    } = req.body;
    
    // Verify group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Verify user is a member of this group
    const isMember = group.members.some(
      m => m.userId.toString() === req.user.id
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }
    
    // Create settlement
    const settlement = await Settlement.create({
      groupId,
      fromUser,
      toUser,
      amount,
      method,
      transactionReference,
      notes,
      relatedExpenses: relatedExpenses || [],
      createdBy: req.user.id
    });
    
    // Mark related expenses as paid
    if (relatedExpenses && relatedExpenses.length > 0) {
      for (const expenseId of relatedExpenses) {
        const expense = await Expense.findById(expenseId);
        if (expense) {
          await expense.markSplitAsPaid(toUser, settlement._id);
        }
      }
    }
    
    // Populate user details
    await settlement.populate('fromUser', 'name phone settings');
    await settlement.populate('toUser', 'name phone settings');
    
    // Send notifications
    await notificationService.sendSettlementConfirmation(
      settlement,
      settlement.fromUser,
      settlement.toUser
    );
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`group_${groupId}`).emit('new-settlement', settlement);
    
    res.status(201).json({
      success: true,
      data: settlement
    });
    
    logger.info(`Settlement created: ${amount} ETB from ${fromUser} to ${toUser}`);
  } catch (error) {
    logger.error('Create settlement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating settlement'
    });
  }
};

// @desc    Get payment options for a debt
// @route   GET /api/v1/settlements/payment-options/:groupId/:userId
// @access  Private
exports.getPaymentOptions = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Get user to pay
    const userToPay = await User.findById(userId);
    if (!userToPay) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Calculate amount owed
    const balances = await group.getBalances();
    const amountOwed = Math.abs(balances[req.user.id] || 0);
    
    if (amountOwed <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No outstanding debt to this user'
      });
    }
    
    const reference = PaymentLinkGenerator.generateReference();
    const paymentOptions = PaymentLinkGenerator.generatePaymentOptions(
      userToPay.phone,
      amountOwed,
      reference
    );
    
    res.json({
      success: true,
      data: {
        amount: amountOwed,
        toUser: {
          id: userToPay._id,
          name: userToPay.name,
          phone: userToPay.phone
        },
        reference,
        paymentOptions
      }
    });
  } catch (error) {
    logger.error('Get payment options error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting payment options'
    });
  }
};

// @desc    Get settlements for a group
// @route   GET /api/v1/settlements/group/:groupId
// @access  Private
exports.getGroupSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;
    
    // Verify user is a member of this group
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    const isMember = group.members.some(
      m => m.userId.toString() === req.user.id
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }
    
    const settlements = await Settlement.find({ groupId })
      .populate('fromUser', 'name avatar')
      .populate('toUser', 'name avatar')
      .sort('-date');
    
    res.json({
      success: true,
      data: settlements
    });
  } catch (error) {
    logger.error('Get settlements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching settlements'
    });
  }
};