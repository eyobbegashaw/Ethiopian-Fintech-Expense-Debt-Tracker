const { DatabaseSync } = require('node:sqlite');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Read schema.js from database directory
const schemaContent = fs.readFileSync(path.join(__dirname, '../src/database/schema.js'), 'utf8');

// Extract CREATE_TABLES_SQL and CREATE_INDEXES_SQL
function extractSqlArrays(content) {
  const tablesMatch = content.match(/export const CREATE_TABLES_SQL = \[([\s\S]*?)\];/);
  const indexesMatch = content.match(/export const CREATE_INDEXES_SQL = \[([\s\S]*?)\];/);

  const evalBacktickArray = (str) => {
    const items = [];
    const regex = /`([\s\S]*?)`/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
      if (match[1].trim()) {
        items.push(match[1].trim());
      }
    }
    return items;
  };

  const evalSingleQuoteArray = (str) => {
    const items = [];
    const regex = /'([\s\S]*?)'/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
      if (match[1].trim()) {
        items.push(match[1].trim());
      }
    }
    return items;
  };

  return {
    tables: evalBacktickArray(tablesMatch[1]),
    indexes: evalSingleQuoteArray(indexesMatch[1]),
  };
}

async function runVerification() {
  console.log('====================================================');
  console.log('ETHIO DEBT TRACKER — OFFLINE ARCHITECTURE TEST SUITE');
  console.log('====================================================\n');

  const db = new DatabaseSync(':memory:');
  console.log('✓ SQLite in-memory database initialized');

  const { tables, indexes } = extractSqlArrays(schemaContent);

  // 1. Verify 23 Tables
  console.log(`\n[1/7] Testing Schema DDL (${tables.length} tables)...`);
  for (const sql of tables) {
    db.exec(sql);
  }
  console.log(`✓ All ${tables.length} tables created successfully.`);

  // Verify list of tables
  const createdTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;").all();
  console.log(`✓ Found ${createdTables.length} tables in sqlite_master:`);
  console.log(createdTables.map(t => '  - ' + t.name).join('\n'));

  // 2. Verify Indexes
  console.log(`\n[2/7] Testing Indexes (${indexes.length} indexes)...`);
  for (const sql of indexes) {
    db.exec(sql);
  }
  console.log(`✓ All ${indexes.length} indexes created successfully.`);

  // 3. User Registration Simulation
  console.log('\n[3/7] Testing Local Offline Registration & Password Security...');
  const userId = 'usr_' + crypto.randomUUID().slice(0, 8);
  const salt = crypto.randomBytes(16).toString('hex');
  const password = 'mypassword123';
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256').toString('hex');
  const recoveryCode = 'ETH-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, phone, name, email, password_hash, salt, avatar, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);
  `).run(userId, '0911223344', 'Abebe Bikila', 'abebe@example.com', hash, salt, null, now, now);

  db.prepare(`
    INSERT INTO user_profiles (user_id, display_name, phone, currency, calendar_preference, time_format, language, theme, biometric_enabled, recovery_code, updated_at)
    VALUES (?, ?, ?, 'ETB', 'ethiopian', '12h', 'am', 'system', 0, ?, ?);
  `).run(userId, 'Abebe Bikila', '0911223344', recoveryCode, now);

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?;').get(userId);
  const profileRow = db.prepare('SELECT * FROM user_profiles WHERE user_id = ?;').get(userId);
  console.log(`✓ User created: ${userRow.name} (${userRow.phone})`);
  console.log(`✓ Salted Hash verified: ${userRow.password_hash.slice(0, 16)}...`);
  console.log(`✓ Recovery Code stored: ${profileRow.recovery_code}`);

  // Test Password Verification
  const verifyHash = crypto.pbkdf2Sync(password, userRow.salt, 10000, 32, 'sha256').toString('hex');
  if (verifyHash === userRow.password_hash) {
    console.log('✓ Password authentication test PASSED');
  } else {
    throw new Error('Password authentication failed');
  }

  // 4. Financial Accounts & Transfers
  console.log('\n[4/7] Testing Financial Accounts & Inter-Account Transfers...');
  const cashAccId = 'acc_cash_1';
  const cbeAccId = 'acc_cbe_2';

  db.prepare(`
    INSERT INTO financial_accounts (id, user_id, name, type, institution, initial_balance, current_balance, currency, is_default, created_at, updated_at)
    VALUES (?, ?, 'Pocket Cash', 'cash', 'Cash', 500, 500, 'ETB', 1, ?, ?);
  `).run(cashAccId, userId, now, now);

  db.prepare(`
    INSERT INTO financial_accounts (id, user_id, name, type, institution, initial_balance, current_balance, currency, is_default, created_at, updated_at)
    VALUES (?, ?, 'CBE Account', 'cbe', 'Commercial Bank of Ethiopia', 3000, 3000, 'ETB', 0, ?, ?);
  `).run(cbeAccId, userId, now, now);

  // Transfer 1000 ETB from CBE to Cash (ATM Withdrawal)
  const transferAmount = 1000;
  db.prepare('UPDATE financial_accounts SET current_balance = current_balance - ? WHERE id = ?;').run(transferAmount, cbeAccId);
  db.prepare('UPDATE financial_accounts SET current_balance = current_balance + ? WHERE id = ?;').run(transferAmount, cashAccId);

  db.prepare(`
    INSERT INTO account_transactions (id, user_id, account_id, to_account_id, type, amount, currency, category, description, date, source, is_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'transfer', ?, 'ETB', 'Transfer', 'ATM Cash Withdrawal', ?, 'manual', 1, ?, ?);
  `).run('tx_trans_1', userId, cbeAccId, cashAccId, transferAmount, now, now, now);

  const updatedCash = db.prepare('SELECT current_balance FROM financial_accounts WHERE id = ?;').get(cashAccId);
  const updatedCbe = db.prepare('SELECT current_balance FROM financial_accounts WHERE id = ?;').get(cbeAccId);
  console.log(`✓ CBE Balance after 1,000 ETB withdrawal: ${updatedCbe.current_balance} ETB (Expected: 2000)`);
  console.log(`✓ Cash Balance after 1,000 ETB deposit: ${updatedCash.current_balance} ETB (Expected: 1500)`);
  if (updatedCbe.current_balance !== 2000 || updatedCash.current_balance !== 1500) {
    throw new Error('Transfer balance mismatch');
  }

  // 5. Group Expense & Split Debts
  console.log('\n[5/7] Testing Group Expenses & Debt Splitting...');
  const groupId = 'grp_lunch_1';
  db.prepare(`
    INSERT INTO groups (id, name, type, currency, created_by, simplify_debts, created_at, updated_at)
    VALUES (?, 'Bole Lunch Group', 'household', 'ETB', ?, 1, ?, ?);
  `).run(groupId, userId, now, now);

  const expId = 'exp_bole_1';
  const totalBill = 600;
  const friendId = 'usr_friend_dawit';

  // Abebe pays 600 ETB for lunch split equally with Dawit (300 ETB each)
  db.prepare(`
    INSERT INTO group_expenses (id, group_id, description, amount, currency, paid_by_user_id, paid_by_name, date, category, split_type, created_at, updated_at)
    VALUES (?, ?, 'Kitfo Lunch at Bole', ?, 'ETB', ?, 'Abebe Bikila', ?, 'Food', 'equal', ?, ?);
  `).run(expId, groupId, totalBill, userId, now, now, now);

  db.prepare(`
    INSERT INTO debts (id, group_id, expense_id, from_user_id, from_user_name, to_user_id, to_user_name, amount, currency, is_settled, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'Dawit Haile', ?, 'Abebe Bikila', 300, 'ETB', 0, ?, ?);
  `).run('debt_1', groupId, expId, friendId, userId, now, now);

  const activeDebt = db.prepare('SELECT * FROM debts WHERE group_id = ? AND is_settled = 0;').get(groupId);
  console.log(`✓ Generated Debt: ${activeDebt.from_user_name} owes ${activeDebt.to_user_name} ${activeDebt.amount} ${activeDebt.currency}`);

  // Settle Debt
  db.prepare(`
    INSERT INTO debt_settlements (id, group_id, from_user_id, to_user_id, amount, currency, payment_method, transaction_reference, settlement_date, created_at)
    VALUES (?, ?, ?, ?, 300, 'ETB', 'telebirr', 'TB_CONF_8849', ?, ?);
  `).run('stl_1', groupId, friendId, userId, now, now);

  db.prepare('UPDATE debts SET is_settled = 1 WHERE id = ?;').run('debt_1');
  const settledDebt = db.prepare('SELECT is_settled FROM debts WHERE id = ?;').get('debt_1');
  console.log(`✓ Debt settled: ${settledDebt.is_settled === 1 ? 'YES' : 'NO'}`);

  // 6. Budgets & Planned Bills & Savings Goals
  console.log('\n[6/7] Testing Budgets, Planned Expenses & Savings Goals...');
  db.prepare(`
    INSERT INTO budgets (id, user_id, name, category, amount, currency, period, start_date, end_date, alert_thresholds, is_active, created_at, updated_at)
    VALUES ('bgt_1', ?, 'Monthly Food', 'Food', 4000, 'ETB', 'monthly', '2026-11-01', '2026-11-30', '80,100', 1, ?, ?);
  `).run(userId, now, now);

  db.prepare(`
    INSERT INTO planned_expenses (id, user_id, title, category, amount, currency, due_date, recurrence, is_paid, created_at, updated_at)
    VALUES ('pln_1', ?, 'Ethio Telecom Fiber', 'Utilities', 1200, 'ETB', '2026-11-25', 'monthly', 0, ?, ?);
  `).run(userId, now, now);

  db.prepare(`
    INSERT INTO savings_goals (id, user_id, title, target_amount, current_amount, currency, target_date, category, is_completed, created_at, updated_at)
    VALUES ('svg_1', ?, 'New Laptop', 80000, 25000, 'ETB', '2027-04-01', 'Electronics', 0, ?, ?);
  `).run(userId, now, now);

  const budgetRow = db.prepare('SELECT * FROM budgets WHERE id = ?;').get('bgt_1');
  const planRow = db.prepare('SELECT * FROM planned_expenses WHERE id = ?;').get('pln_1');
  const saveRow = db.prepare('SELECT * FROM savings_goals WHERE id = ?;').get('svg_1');
  console.log(`✓ Budget active: ${budgetRow.name} (${budgetRow.amount} ${budgetRow.currency})`);
  console.log(`✓ Planned Bill due: ${planRow.title} (${planRow.amount} ${planRow.currency}) on ${planRow.due_date}`);
  console.log(`✓ Savings Goal: ${saveRow.title} (${saveRow.current_amount} / ${saveRow.target_amount} ${saveRow.currency})`);

  // 7. Backup Export & Checksum Verification & Restore
  console.log('\n[7/7] Testing Backup Export, SHA-256 Checksum & Restore...');
  const backupExport = {
    app: 'Ethio Debt Tracker',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    userId,
    data: {
      accounts: db.prepare('SELECT * FROM financial_accounts WHERE user_id = ?;').all(userId),
      transactions: db.prepare('SELECT * FROM account_transactions WHERE user_id = ?;').all(userId),
      groups: db.prepare('SELECT * FROM groups WHERE created_by = ?;').all(userId),
      debts: db.prepare('SELECT * FROM debts WHERE from_user_id = ? OR to_user_id = ?;').all(userId, userId),
      budgets: db.prepare('SELECT * FROM budgets WHERE user_id = ?;').all(userId),
    },
  };

  const backupJsonString = JSON.stringify(backupExport);
  const sha256Checksum = crypto.createHash('sha256').update(backupJsonString).digest('hex');
  const finalBackupPackage = JSON.stringify({ ...backupExport, checksum: sha256Checksum });

  console.log(`✓ Exported Backup JSON: ${finalBackupPackage.length} bytes`);
  console.log(`✓ SHA-256 Integrity Hash: ${sha256Checksum}`);

  // Validate Backup
  const parsedBackup = JSON.parse(finalBackupPackage);
  const { checksum, ...contentWithoutChecksum } = parsedBackup;
  const recalculated = crypto.createHash('sha256').update(JSON.stringify(contentWithoutChecksum)).digest('hex');

  if (recalculated === checksum) {
    console.log('✓ Backup Integrity Check PASSED: SHA-256 Verified');
  } else {
    throw new Error('Backup integrity checksum mismatch');
  }

  console.log('\n====================================================');
  console.log('ALL OFFLINE ARCHITECTURE TESTS PASSED SUCCESSFULLY! ✓');
  console.log('====================================================\n');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
