/**
 * Ethio Debt Tracker - 23 Local SQLite Database Tables & Schema
 */

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = [
  // 1. users
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    avatar TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // 2. user_profiles
  `CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY,
    display_name TEXT,
    phone TEXT,
    currency TEXT DEFAULT 'ETB',
    calendar_preference TEXT DEFAULT 'ethiopian',
    time_format TEXT DEFAULT '12h',
    language TEXT DEFAULT 'am',
    theme TEXT DEFAULT 'system',
    biometric_enabled INTEGER DEFAULT 0,
    security_question TEXT,
    security_answer_hash TEXT,
    recovery_code TEXT,
    avatar_url TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,

  // 3. financial_accounts
  `CREATE TABLE IF NOT EXISTS financial_accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    institution TEXT,
    account_number TEXT,
    initial_balance REAL DEFAULT 0,
    current_balance REAL DEFAULT 0,
    currency TEXT DEFAULT 'ETB',
    color TEXT DEFAULT '#2E7D32',
    icon TEXT DEFAULT 'bank',
    is_default INTEGER DEFAULT 0,
    is_archived INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,

  // 4. account_transactions
  `CREATE TABLE IF NOT EXISTS account_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    to_account_id TEXT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ETB',
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    counterparty TEXT,
    date TEXT NOT NULL,
    source TEXT DEFAULT 'manual',
    reference_number TEXT,
    is_verified INTEGER DEFAULT 1,
    status TEXT DEFAULT 'confirmed',
    receipt_uri TEXT,
    notes TEXT,
    planned_expense_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE,
    FOREIGN KEY(to_account_id) REFERENCES financial_accounts(id) ON DELETE SET NULL
  );`,

  // 5. income_records
  `CREATE TABLE IF NOT EXISTS income_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ETB',
    category TEXT NOT NULL,
    source_name TEXT,
    date TEXT NOT NULL,
    receipt_uri TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE
  );`,

  // 6. expense_records
  `CREATE TABLE IF NOT EXISTS expense_records (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ETB',
    category TEXT NOT NULL,
    merchant TEXT,
    date TEXT NOT NULL,
    receipt_uri TEXT,
    status TEXT DEFAULT 'paid',
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES financial_accounts(id) ON DELETE CASCADE
  );`,

  // 7. expense_categories
  `CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    is_default INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );`,

  // 8. groups
  `CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    currency TEXT DEFAULT 'ETB',
    created_by TEXT NOT NULL,
    simplify_debts INTEGER DEFAULT 1,
    icon TEXT,
    banner TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE
  );`,

  // 9. group_members
  `CREATE TABLE IF NOT EXISTS group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    user_id TEXT,
    member_name TEXT NOT NULL,
    member_phone TEXT,
    role TEXT DEFAULT 'member',
    joined_at TEXT NOT NULL,
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
  );`,

  // 10. group_expenses
  `CREATE TABLE IF NOT EXISTS group_expenses (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ETB',
    paid_by_user_id TEXT NOT NULL,
    paid_by_name TEXT,
    date TEXT NOT NULL,
    category TEXT DEFAULT 'Other',
    split_type TEXT DEFAULT 'equal',
    receipt_uri TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
  );`,

  // 11. debts
  `CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    group_id TEXT,
    expense_id TEXT,
    from_user_id TEXT NOT NULL,
    from_user_name TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    to_user_name TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ETB',
    is_settled INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY(expense_id) REFERENCES group_expenses(id) ON DELETE CASCADE
  );`,

  // 12. debt_settlements
  `CREATE TABLE IF NOT EXISTS debt_settlements (
    id TEXT PRIMARY KEY,
    group_id TEXT,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ETB',
    payment_method TEXT DEFAULT 'cash',
    transaction_reference TEXT,
    settlement_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE SET NULL
  );`,

  // 13. friends
  `CREATE TABLE IF NOT EXISTS friends (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    friend_user_id TEXT,
    friend_name TEXT NOT NULL,
    friend_phone TEXT NOT NULL,
    friend_avatar TEXT,
    net_balance REAL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,

  // 14. friend_requests
  `CREATE TABLE IF NOT EXISTS friend_requests (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    from_user_name TEXT NOT NULL,
    from_user_phone TEXT NOT NULL,
    to_phone TEXT NOT NULL,
    status TEXT DEFAULT 'accepted',
    created_at TEXT NOT NULL,
    FOREIGN KEY(from_user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,

  // 15. budgets
  `CREATE TABLE IF NOT EXISTS budgets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ETB',
    period TEXT DEFAULT 'monthly',
    start_date TEXT NOT NULL,
    end_date TEXT,
    alert_thresholds TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,

  // 16. planned_expenses
  `CREATE TABLE IF NOT EXISTS planned_expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ETB',
    category TEXT DEFAULT 'Utilities',
    due_date TEXT NOT NULL,
    recurrence TEXT DEFAULT 'none',
    reminder_days_before INTEGER DEFAULT 2,
    is_paid INTEGER DEFAULT 0,
    paid_date TEXT,
    paid_transaction_id TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES financial_accounts(id) ON DELETE SET NULL
  );`,

  // 17. recurring_expenses
  `CREATE TABLE IF NOT EXISTS recurring_expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ETB',
    category TEXT NOT NULL,
    frequency TEXT DEFAULT 'monthly',
    next_due_date TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES financial_accounts(id) ON DELETE SET NULL
  );`,

  // 18. savings_goals
  `CREATE TABLE IF NOT EXISTS savings_goals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT,
    title TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    currency TEXT DEFAULT 'ETB',
    target_date TEXT,
    category TEXT DEFAULT 'Emergency Fund',
    icon TEXT DEFAULT 'piggy-bank',
    color TEXT DEFAULT '#2E7D32',
    is_completed INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES financial_accounts(id) ON DELETE SET NULL
  );`,

  // 19. savings_contributions
  `CREATE TABLE IF NOT EXISTS savings_contributions (
    id TEXT PRIMARY KEY,
    goal_id TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ETB',
    date TEXT NOT NULL,
    note TEXT,
    account_id TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE,
    FOREIGN KEY(account_id) REFERENCES financial_accounts(id) ON DELETE SET NULL
  );`,

  // 20. sms_imported_transactions
  `CREATE TABLE IF NOT EXISTS sms_imported_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    raw_message TEXT NOT NULL,
    sender TEXT,
    provider TEXT NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'ETB',
    reference_number TEXT,
    transaction_date TEXT NOT NULL,
    detected_balance REAL,
    counterparty TEXT,
    detected_category TEXT,
    matched_account_id TEXT,
    status TEXT DEFAULT 'unverified',
    rejection_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(matched_account_id) REFERENCES financial_accounts(id) ON DELETE SET NULL
  );`,

  // 21. notification_settings
  `CREATE TABLE IF NOT EXISTS notification_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    upcoming_bills_enabled INTEGER DEFAULT 1,
    budget_alerts_enabled INTEGER DEFAULT 1,
    daily_reminder_enabled INTEGER DEFAULT 0,
    reminder_time TEXT DEFAULT '09:00',
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,

  // 22. app_settings
  `CREATE TABLE IF NOT EXISTS app_settings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    offline_mode_strict INTEGER DEFAULT 1,
    auto_lock_minutes INTEGER DEFAULT 5,
    biometric_lock INTEGER DEFAULT 0,
    language TEXT DEFAULT 'am',
    calendar TEXT DEFAULT 'ethiopian',
    time_format TEXT DEFAULT '12h',
    theme TEXT DEFAULT 'system',
    dark_mode INTEGER DEFAULT 0,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,

  // 23. transaction_attachments
  `CREATE TABLE IF NOT EXISTS transaction_attachments (
    id TEXT PRIMARY KEY,
    transaction_id TEXT,
    expense_id TEXT,
    file_uri TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY(transaction_id) REFERENCES account_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY(expense_id) REFERENCES group_expenses(id) ON DELETE CASCADE
  );`,
];

export const CREATE_INDEXES_SQL = [
  'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);',
  'CREATE INDEX IF NOT EXISTS idx_accounts_user ON financial_accounts(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON account_transactions(user_id, date);',
  'CREATE INDEX IF NOT EXISTS idx_transactions_account ON account_transactions(account_id);',
  'CREATE INDEX IF NOT EXISTS idx_income_user ON income_records(user_id, date);',
  'CREATE INDEX IF NOT EXISTS idx_expense_user ON expense_records(user_id, date);',
  'CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);',
  'CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);',
  'CREATE INDEX IF NOT EXISTS idx_group_expenses_group ON group_expenses(group_id);',
  'CREATE INDEX IF NOT EXISTS idx_debts_group ON debts(group_id);',
  'CREATE INDEX IF NOT EXISTS idx_debts_users ON debts(from_user_id, to_user_id);',
  'CREATE INDEX IF NOT EXISTS idx_settlements_group ON debt_settlements(group_id);',
  'CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_planned_user_due ON planned_expenses(user_id, is_paid, due_date);',
  'CREATE INDEX IF NOT EXISTS idx_savings_user ON savings_goals(user_id);',
  'CREATE INDEX IF NOT EXISTS idx_sms_user_status ON sms_imported_transactions(user_id, status);',
  'CREATE INDEX IF NOT EXISTS idx_sms_ref ON sms_imported_transactions(user_id, reference_number);',
];

export const DEFAULT_CATEGORIES = [
  { id: 'cat_food', name: 'Food & Dining', type: 'expense', icon: 'silverware-fork-knife', color: '#D32F2F' },
  { id: 'cat_groceries', name: 'Groceries', type: 'expense', icon: 'cart', color: '#E65100' },
  { id: 'cat_transport', name: 'Transportation', type: 'expense', icon: 'taxi', color: '#1976D2' },
  { id: 'cat_rent', name: 'Housing & Rent', type: 'expense', icon: 'home', color: '#512DA8' },
  { id: 'cat_util', name: 'Utilities', type: 'expense', icon: 'flash', color: '#F57C00' },
  { id: 'cat_health', name: 'Health & Medical', type: 'expense', icon: 'medical-bag', color: '#C2185B' },
  { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', icon: 'movie', color: '#00796B' },
  { id: 'cat_education', name: 'Education', type: 'expense', icon: 'school', color: '#303F9F' },
  { id: 'cat_shopping', name: 'Shopping', type: 'expense', icon: 'shopping', color: '#7B1FA2' },
  { id: 'cat_coffee', name: 'Coffee Ceremony', type: 'expense', icon: 'coffee', color: '#5D4037' },
  { id: 'cat_other_exp', name: 'Other Expense', type: 'expense', icon: 'dots-horizontal', color: '#616161' },
  { id: 'cat_salary', name: 'Salary', type: 'income', icon: 'cash-multiple', color: '#2E7D32' },
  { id: 'cat_business', name: 'Business', type: 'income', icon: 'store', color: '#388E3C' },
  { id: 'cat_freelance', name: 'Freelance', type: 'income', icon: 'laptop', color: '#00897B' },
  { id: 'cat_gift', name: 'Gift', type: 'income', icon: 'gift', color: '#0097A7' },
  { id: 'cat_equb_payout', name: 'Group Payout', type: 'income', icon: 'hand-coin', color: '#43A047' },
  { id: 'cat_other_inc', name: 'Other Income', type: 'income', icon: 'plus-circle', color: '#689F38' },
];
