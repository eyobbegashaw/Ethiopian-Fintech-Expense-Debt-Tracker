const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Import all models to ensure schemas are registered
const User = require('../models/User');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const FriendRequest = require('../models/FriendRequest');
const Notification = require('../models/Notification');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const PlannedExpense = require('../models/PlannedExpense');
const SavingsGoal = require('../models/SavingsGoal');
const SMSParsedTransaction = require('../models/SMSParsedTransaction');

const models = [
  { name: 'User', model: User, collectionName: 'users' },
  { name: 'Group', model: Group, collectionName: 'groups' },
  { name: 'Expense', model: Expense, collectionName: 'expenses' },
  { name: 'Settlement', model: Settlement, collectionName: 'settlements' },
  { name: 'FriendRequest', model: FriendRequest, collectionName: 'friendrequests' },
  { name: 'Notification', model: Notification, collectionName: 'notifications' },
  { name: 'Account', model: Account, collectionName: 'accounts' },
  { name: 'Transaction', model: Transaction, collectionName: 'transactions' },
  { name: 'Budget', model: Budget, collectionName: 'budgets' },
  { name: 'PlannedExpense', model: PlannedExpense, collectionName: 'plannedexpenses' },
  { name: 'SavingsGoal', model: SavingsGoal, collectionName: 'savingsgoals' },
  { name: 'SMSParsedTransaction', model: SMSParsedTransaction, collectionName: 'smsparsedtransactions' }
];

/**
 * Explicitly initializes all database collections and indexes
 */
async function initDatabase() {
  try {
    const existingCollectionsCursor = await mongoose.connection.db.listCollections();
    const existingCollections = (await existingCollectionsCursor.toArray()).map(c => c.name);

    logger.info(`Connected database: "${mongoose.connection.name}"`);

    for (const { name, model, collectionName } of models) {
      // 1. Create collection if it does not already exist
      if (!existingCollections.includes(collectionName)) {
        await model.createCollection();
        logger.info(`✓ Created database collection: "${collectionName}" (${name})`);
      } else {
        logger.info(`✓ Verified collection: "${collectionName}" (${name})`);
      }

      // 2. Build and verify schema indexes safely
      try {
        if (collectionName === 'friendrequests') {
          try {
            const indexes = await model.collection.indexes();
            const legacy = indexes.find(i => i.name === 'fromUser_1_toUser_1');
            if (legacy) {
              await model.collection.dropIndex('fromUser_1_toUser_1');
              logger.info('✓ Replaced legacy friendrequest index with partial unique index');
            }
          } catch (e) {
            // Ignore if index doesn't exist
          }
        }
        await model.createIndexes();
      } catch (idxErr) {
        logger.warn(`Index warning on ${collectionName}: ${idxErr.message}`);
      }
    }

    logger.info('All database tables/collections and indexes verified successfully.');
    return true;
  } catch (error) {
    logger.error(`Error initializing database collections: ${error.message}`);
    return false;
  }
}

module.exports = { initDatabase, models };
