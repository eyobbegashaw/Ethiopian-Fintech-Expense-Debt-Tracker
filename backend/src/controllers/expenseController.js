const Expense = require('../models/Expense');
const Group = require('../models/Group');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

// @desc    Add expense to group
// @route   POST /api/v1/expenses
// @access  Private
exports.addExpense = async (req, res) => {
  try {
    const {
      groupId,
      description,
      amount,
      paidBy,
      date,
      category,
      splits,
      notes
    } = req.body;
    
    // Verify group exists and user is member
    const group = await Group.findById(groupId).populate('members.userId', 'name phone settings');
    
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    const isMember = group.members.some(m => m.userId._id.toString() === req.user.id);
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this group'
      });
    }
    
    // Validate splits sum to amount
    const totalShares = splits.reduce((sum, split) => sum + split.share, 0);
    if (Math.abs(totalShares - amount) > 0.01) {
      return res.status(400).json({
        success: false,
        message: 'Split amounts do not sum to total amount'
      });
    }
    
    // Create expense
    const expense = await Expense.create({
      groupId,
      description,
      amount,
      paidBy,
      date: date || new Date(),
      category: category || 'Other',
      splits,
      notes,
      createdBy: req.user.id
    });
    
    // Populate user details
    await expense.populate('paidBy', 'name avatar phone');
    await expense.populate('splits.userId', 'name avatar phone');
    
    // Send notifications to group members
    const membersToNotify = group.members.filter(
      m => m.userId._id.toString() !== req.user.id
    );
    
    const expenseWithPayer = {
      ...expense.toObject(),
      paidByName: expense.paidBy.name
    };
    
    await notificationService.sendExpenseNotification(expenseWithPayer, membersToNotify);
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`group_${groupId}`).emit('new-expense', expense);
    
    res.status(201).json({
      success: true,
      data: expense
    });
    
    logger.info(`Expense added: ${description} for ${amount} ETB in group ${groupId}`);
  } catch (error) {
    logger.error('Add expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding expense'
    });
  }
};

// @desc    Get expenses for a group
// @route   GET /api/v1/expenses/group/:groupId
// @access  Private
exports.getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { page = 1, limit = 20, category } = req.query;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }
    
    // Build query
    const query = { groupId, isDeleted: false };
    if (category) query.category = category;
    
    const expenses = await Expense.find(query)
      .populate('paidBy', 'name avatar')
      .populate('splits.userId', 'name avatar')
      .sort('-date')
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await Expense.countDocuments(query);
    
    res.json({
      success: true,
      data: expenses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching expenses'
    });
  }
};

// @desc    Delete expense
// @route   DELETE /api/v1/expenses/:id
// @access  Private
exports.deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    
    if (!expense) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }
    
    // Check authorization
    const group = await Group.findById(expense.groupId);
    const isCreator = expense.createdBy.toString() === req.user.id;
    const isAdmin = group.members.some(
      m => m.userId.toString() === req.user.id && m.role === 'admin'
    );
    
    if (!isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this expense'
      });
    }
    
    // Soft delete
    expense.isDeleted = true;
    expense.deletedAt = new Date();
    await expense.save();
    
    // Emit socket event
    const io = req.app.get('io');
    io.to(`group_${expense.groupId}`).emit('delete-expense', expense._id);
    
    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
    
    logger.info(`Expense deleted: ${expense._id}`);
  } catch (error) {
    logger.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting expense'
    });
  }
};