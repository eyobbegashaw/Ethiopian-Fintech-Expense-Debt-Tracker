const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');

// @desc    Get all accounts for current user
// @route   GET /api/v1/accounts
// @access  Private
exports.getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find({
      userId: req.user._id,
      isArchived: false,
    }).sort({ isDefault: -1, createdAt: -1 });

    const totalBalance = accounts.reduce((acc, curr) => acc + (curr.balance || 0), 0);

    res.status(200).json({
      success: true,
      count: accounts.length,
      totalBalance,
      data: accounts,
    });
  } catch (error) {
    logger.error('Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching accounts',
      error: error.message,
    });
  }
};

// @desc    Get single account by ID
// @route   GET /api/v1/accounts/:id
// @access  Private
exports.getAccountById = async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    const recentTransactions = await Transaction.find({
      userId: req.user._id,
      $or: [{ accountId: account._id }, { toAccountId: account._id }],
    })
      .sort({ date: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: {
        account,
        recentTransactions,
      },
    });
  } catch (error) {
    logger.error('Error fetching account details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching account',
      error: error.message,
    });
  }
};

// @desc    Create a new account
// @route   POST /api/v1/accounts
// @access  Private
exports.createAccount = async (req, res) => {
  try {
    const {
      name,
      type,
      institution,
      accountNumber,
      initialBalance = 0,
      currency = 'ETB',
      color,
      icon,
      isDefault = false,
      notes,
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name and type are required',
      });
    }

    // Default institutions based on type if not specified
    let finalInstitution = institution;
    if (!finalInstitution) {
      if (type === 'cbe') finalInstitution = 'Commercial Bank of Ethiopia';
      else if (type === 'telebirr') finalInstitution = 'Ethio Telecom (Telebirr)';
      else if (type === 'cbe_birr') finalInstitution = 'CBE Birr';
      else if (type === 'amole') finalInstitution = 'Dashen Bank (Amole)';
      else if (type === 'cash') finalInstitution = 'Cash in Hand';
      else finalInstitution = 'Other Bank';
    }

    // If marked default, remove default from other user accounts
    if (isDefault) {
      await Account.updateMany(
        { userId: req.user._id },
        { isDefault: false }
      );
    }

    const account = await Account.create({
      userId: req.user._id,
      name,
      type,
      institution: finalInstitution,
      accountNumber: accountNumber || '',
      initialBalance: Number(initialBalance) || 0,
      balance: Number(initialBalance) || 0,
      currency,
      color: color || '#2E7D32',
      icon: icon || 'bank',
      isDefault: Boolean(isDefault),
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      data: account,
    });
  } catch (error) {
    logger.error('Error creating account:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating account',
      error: error.message,
    });
  }
};

// @desc    Update account
// @route   PUT /api/v1/accounts/:id
// @access  Private
exports.updateAccount = async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    const { name, institution, accountNumber, color, icon, isDefault, notes, balance } = req.body;

    if (name) account.name = name;
    if (institution) account.institution = institution;
    if (accountNumber !== undefined) account.accountNumber = accountNumber;
    if (color) account.color = color;
    if (icon) account.icon = icon;
    if (notes !== undefined) account.notes = notes;
    if (balance !== undefined && !isNaN(balance)) account.balance = Number(balance);

    if (isDefault) {
      await Account.updateMany(
        { userId: req.user._id },
        { isDefault: false }
      );
      account.isDefault = true;
    }

    await account.save();

    res.status(200).json({
      success: true,
      data: account,
    });
  } catch (error) {
    logger.error('Error updating account:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating account',
      error: error.message,
    });
  }
};

// @desc    Delete (or archive) account
// @route   DELETE /api/v1/accounts/:id
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    const account = await Account.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Account not found',
      });
    }

    // Check if account has transactions
    const hasTransactions = await Transaction.exists({
      $or: [{ accountId: account._id }, { toAccountId: account._id }],
    });

    if (hasTransactions) {
      // Soft delete by archiving to preserve financial records
      account.isArchived = true;
      await account.save();
      return res.status(200).json({
        success: true,
        message: 'Account archived to preserve transaction history',
        data: account,
      });
    }

    await Account.deleteOne({ _id: account._id });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting account',
      error: error.message,
    });
  }
};

// @desc    Transfer money between accounts
// @route   POST /api/v1/accounts/transfer
// @access  Private
exports.transferFunds = async (req, res) => {
  try {
    const { fromAccountId, toAccountId, amount, date, notes } = req.body;

    if (!fromAccountId || !toAccountId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Source account, destination account, and amount are required',
      });
    }

    if (fromAccountId === toAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Source and destination accounts must be different',
      });
    }

    const transferAmount = Number(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Transfer amount must be a positive number',
      });
    }

    const fromAccount = await Account.findOne({
      _id: fromAccountId,
      userId: req.user._id,
      isArchived: false,
    });

    const toAccount = await Account.findOne({
      _id: toAccountId,
      userId: req.user._id,
      isArchived: false,
    });

    if (!fromAccount || !toAccount) {
      return res.status(404).json({
        success: false,
        message: 'One or both accounts were not found',
      });
    }

    // Update balances
    fromAccount.balance = (fromAccount.balance || 0) - transferAmount;
    toAccount.balance = (toAccount.balance || 0) + transferAmount;

    await fromAccount.save();
    await toAccount.save();

    // Create Transfer Transaction (type: 'transfer')
    // Important: Transfers are excluded from income and expense calculations!
    const transaction = await Transaction.create({
      userId: req.user._id,
      type: 'transfer',
      accountId: fromAccount._id,
      toAccountId: toAccount._id,
      amount: transferAmount,
      currency: fromAccount.currency,
      category: 'Transfer',
      description: `Transfer from ${fromAccount.name} to ${toAccount.name}`,
      counterparty: toAccount.name,
      date: date ? new Date(date) : new Date(),
      source: 'manual',
      notes: notes || '',
    });

    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        transaction,
        fromAccount,
        toAccount,
      },
    });
  } catch (error) {
    logger.error('Error during fund transfer:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during transfer',
      error: error.message,
    });
  }
};
