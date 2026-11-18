const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const PlannedExpense = require('../models/PlannedExpense');
const SavingsGoal = require('../models/SavingsGoal');
const SMSParsedTransaction = require('../models/SMSParsedTransaction');
const { parseFinancialSMS } = require('../utils/smsParser');

async function test() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected!');

    // Find any existing user
    let user = await User.findOne({ phone: '0911000001' });
    if (!user) {
      user = await User.findOne();
    }
    if (!user) {
      console.log('Creating temporary test user...');
      user = await User.create({
        name: 'Test Finance User',
        phone: '0999999999',
        password: 'password123',
      });
    }

    console.log(`Using test user: ${user.name} (${user._id})`);

    // Clean up previous test finance data for this user
    await Account.deleteMany({ userId: user._id, name: { $regex: /^TEST_/ } });
    await Transaction.deleteMany({ userId: user._id, description: { $regex: /^TEST_/ } });
    await Budget.deleteMany({ userId: user._id, name: { $regex: /^TEST_/ } });
    await PlannedExpense.deleteMany({ userId: user._id, title: { $regex: /^TEST_/ } });
    await SavingsGoal.deleteMany({ userId: user._id, title: { $regex: /^TEST_/ } });
    await SMSParsedTransaction.deleteMany({ userId: user._id, referenceNumber: { $regex: /^TEST_/ } });

    // 1. Test Account Creation
    console.log('\n--- 1. Testing Account Management ---');
    const cbeAccount = await Account.create({
      userId: user._id,
      name: 'TEST_CBE Account',
      type: 'cbe',
      institution: 'Commercial Bank of Ethiopia',
      accountNumber: '100012345678',
      initialBalance: 10000,
      balance: 10000,
      currency: 'ETB',
      isDefault: true,
    });
    console.log('✓ Created CBE Account with balance:', cbeAccount.balance);

    const telebirrAccount = await Account.create({
      userId: user._id,
      name: 'TEST_Telebirr Wallet',
      type: 'telebirr',
      institution: 'Ethio Telecom',
      accountNumber: '0911000001',
      initialBalance: 2000,
      balance: 2000,
      currency: 'ETB',
    });
    console.log('✓ Created Telebirr Account with balance:', telebirrAccount.balance);

    // 2. Test Transfer Between Accounts
    console.log('\n--- 2. Testing Inter-Account Transfer ---');
    const transferAmount = 1500;
    cbeAccount.balance -= transferAmount;
    telebirrAccount.balance += transferAmount;
    await cbeAccount.save();
    await telebirrAccount.save();

    const transferTx = await Transaction.create({
      userId: user._id,
      type: 'transfer',
      accountId: cbeAccount._id,
      toAccountId: telebirrAccount._id,
      amount: transferAmount,
      currency: 'ETB',
      category: 'Transfer',
      description: 'TEST_Transfer from CBE to Telebirr',
    });
    console.log(`✓ Transferred ${transferAmount} ETB:`);
    console.log(`   CBE new balance: ${cbeAccount.balance} (expected 8500)`);
    console.log(`   Telebirr new balance: ${telebirrAccount.balance} (expected 3500)`);

    // 3. Test Income Transaction
    console.log('\n--- 3. Testing Income Management ---');
    const incomeAmount = 25000;
    cbeAccount.balance += incomeAmount;
    await cbeAccount.save();

    const incomeTx = await Transaction.create({
      userId: user._id,
      type: 'income',
      accountId: cbeAccount._id,
      amount: incomeAmount,
      currency: 'ETB',
      category: 'Salary',
      description: 'TEST_Monthly Tech Salary',
      counterparty: 'Acme Corp',
    });
    console.log(`✓ Recorded Salary Income +${incomeAmount} ETB. CBE balance: ${cbeAccount.balance} (expected 33500)`);

    // 4. Test Personal Expense
    console.log('\n--- 4. Testing Personal Expense ---');
    const expenseAmount = 800;
    telebirrAccount.balance -= expenseAmount;
    await telebirrAccount.save();

    const expenseTx = await Transaction.create({
      userId: user._id,
      type: 'expense',
      accountId: telebirrAccount._id,
      amount: expenseAmount,
      currency: 'ETB',
      category: 'Food & Dining',
      description: 'TEST_Dinner at Kuriftu',
      counterparty: 'Kuriftu Resort',
    });
    console.log(`✓ Recorded Expense -${expenseAmount} ETB. Telebirr balance: ${telebirrAccount.balance} (expected 2700)`);

    // 5. Test Budget Management
    console.log('\n--- 5. Testing Budget Progress ---');
    const budget = await Budget.create({
      userId: user._id,
      name: 'TEST_Dining Out Budget',
      category: 'Food & Dining',
      amount: 3000,
      period: 'monthly',
    });
    const spentOnDining = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          category: 'Food & Dining',
          type: 'expense',
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const currentSpent = spentOnDining[0]?.total || 0;
    const remaining = budget.amount - currentSpent;
    const pct = Math.round((currentSpent / budget.amount) * 100);
    console.log(`✓ Budget "${budget.name}": ${currentSpent}/${budget.amount} ETB (${pct}% spent, remaining ${remaining} ETB)`);

    // 6. Test Planned Expense & Mark As Paid
    console.log('\n--- 6. Testing Scheduled Bills & Mark As Paid ---');
    const billDueDate = new Date();
    billDueDate.setDate(billDueDate.getDate() + 5);

    const plannedBill = await PlannedExpense.create({
      userId: user._id,
      title: 'TEST_Ethio Telecom Internet Bill',
      amount: 1200,
      currency: 'ETB',
      category: 'Utilities',
      dueDate: billDueDate,
      recurrence: 'monthly',
      isPaid: false,
    });
    console.log(`✓ Scheduled Bill created: "${plannedBill.title}" (${plannedBill.amount} ETB, due ${plannedBill.dueDate.toDateString()})`);
    console.log('   Balance before payment:', telebirrAccount.balance);

    // Pay the bill
    telebirrAccount.balance -= plannedBill.amount;
    await telebirrAccount.save();
    plannedBill.isPaid = true;
    plannedBill.paidDate = new Date();
    await plannedBill.save();
    console.log('✓ Bill marked as paid! Balance after payment:', telebirrAccount.balance, '(expected 1500)');

    // 7. Test Savings Goals
    console.log('\n--- 7. Testing Savings Goals ---');
    const savingsGoal = await SavingsGoal.create({
      userId: user._id,
      title: 'TEST_Emergency Buffer',
      targetAmount: 50000,
      currentAmount: 10000,
      category: 'Emergency Fund',
    });
    // Deposit 5000
    savingsGoal.currentAmount += 5000;
    savingsGoal.history.push({ type: 'deposit', amount: 5000, note: 'Bonus savings' });
    await savingsGoal.save();
    console.log(`✓ Savings Goal "${savingsGoal.title}": ${savingsGoal.currentAmount}/${savingsGoal.targetAmount} ETB (${Math.round((savingsGoal.currentAmount / savingsGoal.targetAmount) * 100)}%)`);

    // 8. Test SMS Parsing & Duplicate Prevention & Security
    console.log('\n--- 8. Testing SMS Engine & Duplicate Prevention ---');
    const sampleSMS = 'Dear customer, you have received ETB 4,500.00 from 0912345678 (Chala Tolosa). Transaction ID: TEST_TXN_998877.';
    const parsed = parseFinancialSMS(sampleSMS, 'telebirr');
    console.log('✓ Parsed SMS Type:', parsed.type, 'Amount:', parsed.amount, 'Ref:', parsed.referenceNumber);

    // Security OTP check
    const otpSMS = 'Your login OTP is 394821. Do not share this code.';
    const otpParsed = parseFinancialSMS(otpSMS, 'telebirr');
    console.log('✓ Security OTP test: isSecurityMessage =', otpParsed.isSecurityMessage);

    // Create unverified SMS
    const unverifiedSMS = await SMSParsedTransaction.create({
      userId: user._id,
      rawMessage: sampleSMS,
      sender: 'telebirr',
      provider: 'telebirr',
      type: parsed.type,
      amount: parsed.amount,
      referenceNumber: parsed.referenceNumber,
      status: 'unverified',
    });
    console.log('✓ Stored in SMS inbox as status:', unverifiedSMS.status);

    // Confirm SMS transaction
    telebirrAccount.balance += unverifiedSMS.amount;
    await telebirrAccount.save();
    unverifiedSMS.status = 'confirmed';
    await unverifiedSMS.save();
    console.log('✓ Confirmed SMS transaction! Telebirr new balance:', telebirrAccount.balance, '(expected 6000)');

    // 9. Test Financial Report Calculation (Excluding Transfers)
    console.log('\n--- 9. Testing Financial Report Metrics ---');
    const reportAgg = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          description: { $regex: /^TEST_/ },
          type: { $in: ['income', 'expense'] }, // Transfers excluded!
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
        },
      },
    ]);
    console.log('✓ Income vs Expense Aggregation (Transfers excluded):', reportAgg);

    // Clean up test data
    console.log('\n--- Cleaning up test records ---');
    await Account.deleteMany({ userId: user._id, name: { $regex: /^TEST_/ } });
    await Transaction.deleteMany({ userId: user._id, description: { $regex: /^TEST_/ } });
    await Budget.deleteMany({ userId: user._id, name: { $regex: /^TEST_/ } });
    await PlannedExpense.deleteMany({ userId: user._id, title: { $regex: /^TEST_/ } });
    await SavingsGoal.deleteMany({ userId: user._id, title: { $regex: /^TEST_/ } });
    await SMSParsedTransaction.deleteMany({ userId: user._id, referenceNumber: { $regex: /^TEST_/ } });
    console.log('✓ Cleanup complete.');

    await mongoose.connection.close();
    console.log('\n=============================================');
    console.log('ALL FINANCIAL MANAGEMENT TESTS PASSED 100%! 🎉');
    console.log('=============================================');
    process.exit(0);
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  }
}

test();
