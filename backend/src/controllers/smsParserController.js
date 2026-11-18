const SMSParsedTransaction = require('../models/SMSParsedTransaction');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const { parseFinancialSMS } = require('../utils/smsParser');
const logger = require('../utils/logger');

// @desc    Parse SMS preview (dry-run without saving)
// @route   POST /api/v1/sms/parse
// @access  Private
exports.parseSmsPreview = async (req, res) => {
  try {
    const { rawMessage, sender = '' } = req.body;
    if (!rawMessage) {
      return res.status(400).json({
        success: false,
        message: 'Raw message text is required',
      });
    }

    const parsed = parseFinancialSMS(rawMessage, sender);

    if (parsed.isSecurityMessage) {
      return res.status(400).json({
        success: false,
        isSecurityMessage: true,
        message: 'Security / OTP message detected and rejected for your privacy.',
      });
    }

    res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    logger.error('Error parsing SMS preview:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while parsing SMS',
      error: error.message,
    });
  }
};

// @desc    Import an SMS (or batch) into unverified SMS inbox
// @route   POST /api/v1/sms/import
// @access  Private
exports.importSms = async (req, res) => {
  try {
    const { rawMessage, sender = '', messages } = req.body;

    const messagesToProcess = Array.isArray(messages)
      ? messages
      : rawMessage
      ? [{ rawMessage, sender }]
      : [];

    if (messagesToProcess.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No messages provided to import',
      });
    }

    const imported = [];
    const duplicates = [];
    const rejectedSecurity = [];

    // Pre-fetch user accounts for smart account matching
    const userAccounts = await Account.find({ userId: req.user._id, isArchived: false });

    for (const item of messagesToProcess) {
      const text = item.rawMessage || item.body || '';
      const sendFrom = item.sender || item.address || '';

      const parsed = parseFinancialSMS(text, sendFrom);

      if (parsed.isSecurityMessage) {
        rejectedSecurity.push(text.slice(0, 30) + '...');
        continue;
      }

      if (!parsed.amount || parsed.amount <= 0) {
        continue;
      }

      // Check duplicate using reference number if present
      if (parsed.referenceNumber) {
        const existingSMS = await SMSParsedTransaction.findOne({
          userId: req.user._id,
          referenceNumber: parsed.referenceNumber,
        });

        const existingTx = await Transaction.findOne({
          userId: req.user._id,
          smsReference: parsed.referenceNumber,
        });

        if (existingSMS || existingTx) {
          duplicates.push(parsed.referenceNumber);
          continue;
        }
      }

      // Smart match account by provider
      let matchedAccount = null;
      if (parsed.provider === 'telebirr') {
        matchedAccount = userAccounts.find((a) => a.type === 'telebirr');
      } else if (parsed.provider === 'cbe_birr') {
        matchedAccount = userAccounts.find((a) => a.type === 'cbe_birr');
      } else if (parsed.provider === 'cbe') {
        matchedAccount = userAccounts.find((a) => a.type === 'cbe');
      } else if (parsed.provider === 'amole') {
        matchedAccount = userAccounts.find((a) => a.type === 'amole');
      }

      // Fallback to default user account if no exact provider match
      if (!matchedAccount) {
        matchedAccount = userAccounts.find((a) => a.isDefault) || userAccounts[0] || null;
      }

      const smsRecord = await SMSParsedTransaction.create({
        userId: req.user._id,
        rawMessage: text,
        sender: sendFrom || 'Unknown',
        provider: parsed.provider,
        type: parsed.type === 'unknown' ? 'expense' : parsed.type,
        amount: parsed.amount,
        currency: parsed.currency || 'ETB',
        referenceNumber: parsed.referenceNumber || null,
        transactionDate: item.date ? new Date(item.date) : new Date(),
        detectedBalance: parsed.detectedBalance,
        counterparty: parsed.counterparty || '',
        detectedCategory: parsed.detectedCategory || 'Other Expense',
        matchedAccountId: matchedAccount ? matchedAccount._id : null,
        status: 'unverified',
      });

      imported.push(smsRecord);
    }

    res.status(201).json({
      success: true,
      importedCount: imported.length,
      duplicateCount: duplicates.length,
      rejectedSecurityCount: rejectedSecurity.length,
      data: imported,
    });
  } catch (error) {
    logger.error('Error importing SMS:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while importing SMS',
      error: error.message,
    });
  }
};

// @desc    Get all unverified SMS transactions
// @route   GET /api/v1/sms/unverified
// @access  Private
exports.getUnverifiedTransactions = async (req, res) => {
  try {
    const unverified = await SMSParsedTransaction.find({
      userId: req.user._id,
      status: 'unverified',
    })
      .populate('matchedAccountId', 'name type currency color icon')
      .sort({ transactionDate: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: unverified.length,
      data: unverified,
    });
  } catch (error) {
    logger.error('Error fetching unverified SMS transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching SMS transactions',
      error: error.message,
    });
  }
};

// @desc    Confirm unverified transaction into official financial transaction
// @route   POST /api/v1/sms/:id/confirm
// @access  Private
exports.confirmSmsTransaction = async (req, res) => {
  try {
    const smsRecord = await SMSParsedTransaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!smsRecord) {
      return res.status(404).json({
        success: false,
        message: 'SMS transaction not found',
      });
    }

    if (smsRecord.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Transaction is already confirmed',
      });
    }

    const {
      accountId,
      category,
      description,
      amount,
      counterparty,
      date,
    } = req.body;

    const targetAccountId = accountId || smsRecord.matchedAccountId;
    if (!targetAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Please select an account to assign this transaction',
      });
    }

    const account = await Account.findOne({
      _id: targetAccountId,
      userId: req.user._id,
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Selected account not found',
      });
    }

    const finalAmount = amount !== undefined ? Number(amount) : smsRecord.amount;
    const finalType = smsRecord.type === 'income' ? 'income' : 'expense';

    // Update account balance
    if (finalType === 'income') {
      account.balance = (account.balance || 0) + finalAmount;
    } else {
      account.balance = (account.balance || 0) - finalAmount;
    }
    await account.save();

    // Create official Transaction
    const transaction = await Transaction.create({
      userId: req.user._id,
      type: finalType,
      accountId: account._id,
      amount: finalAmount,
      currency: account.currency || 'ETB',
      category: category || smsRecord.detectedCategory || (finalType === 'income' ? 'Other Income' : 'Other Expense'),
      description: description || `SMS ${smsRecord.provider.toUpperCase()}: ${smsRecord.counterparty || smsRecord.referenceNumber || 'Transaction'}`,
      counterparty: counterparty !== undefined ? counterparty : smsRecord.counterparty,
      date: date ? new Date(date) : smsRecord.transactionDate,
      source: 'sms',
      smsReference: smsRecord.referenceNumber,
      isVerified: true,
      status: 'confirmed',
    });

    // Update SMS record
    smsRecord.status = 'confirmed';
    smsRecord.confirmedTransactionId = transaction._id;
    smsRecord.matchedAccountId = account._id;
    await smsRecord.save();

    res.status(200).json({
      success: true,
      message: 'Transaction confirmed successfully and added to your finances',
      data: {
        smsRecord,
        transaction,
        updatedAccountBalance: account.balance,
      },
    });
  } catch (error) {
    logger.error('Error confirming SMS transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while confirming SMS transaction',
      error: error.message,
    });
  }
};

// @desc    Reject unverified transaction
// @route   POST /api/v1/sms/:id/reject
// @access  Private
exports.rejectSmsTransaction = async (req, res) => {
  try {
    const { reason = 'Rejected by user' } = req.body;

    const smsRecord = await SMSParsedTransaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!smsRecord) {
      return res.status(404).json({
        success: false,
        message: 'SMS transaction not found',
      });
    }

    smsRecord.status = 'rejected';
    smsRecord.rejectionReason = reason;
    await smsRecord.save();

    res.status(200).json({
      success: true,
      message: 'SMS transaction rejected',
      data: smsRecord,
    });
  } catch (error) {
    logger.error('Error rejecting SMS transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rejecting SMS transaction',
      error: error.message,
    });
  }
};

// @desc    Delete SMS transaction
// @route   DELETE /api/v1/sms/:id
// @access  Private
exports.deleteSmsTransaction = async (req, res) => {
  try {
    const smsRecord = await SMSParsedTransaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!smsRecord) {
      return res.status(404).json({
        success: false,
        message: 'SMS transaction not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'SMS transaction deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting SMS transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting SMS transaction',
      error: error.message,
    });
  }
};
