import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORIES } from './schema.js';
import { hashPassword } from './security.js';

const STORAGE_KEY = 'ethio_debt_tracker_web_db_v1';

let memoryTables = {};
let isInitialized = false;

/**
 * Load tables from browser storage (localStorage on web or AsyncStorage)
 */
async function loadTablesFromStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        memoryTables = JSON.parse(stored);
        return;
      }
    }
    const getter = AsyncStorage?.getItem || AsyncStorage?.default?.getItem;
    if (getter) {
      const asyncStored = await getter(STORAGE_KEY);
      if (asyncStored) {
        memoryTables = JSON.parse(asyncStored);
        return;
      }
    }
  } catch (err) {
    console.warn('Error reading web storage:', err);
  }
  memoryTables = {};
}

/**
 * Persist current tables state to browser storage
 */
async function persistTablesToStorage() {
  try {
    const serialized = JSON.stringify(memoryTables);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, serialized);
    }
    const setter = AsyncStorage?.setItem || AsyncStorage?.default?.setItem;
    if (setter) {
      await setter(STORAGE_KEY, serialized);
    }
  } catch (err) {
    console.warn('Error saving to web storage:', err);
  }
}

/**
 * Initialize all 23 database tables and initial category seeds on Web
 */
export async function initLocalDatabase() {
  if (isInitialized) return true;

  await loadTablesFromStorage();

  // Ensure all 23 tables exist as arrays
  const requiredTables = [
    'users',
    'user_profiles',
    'financial_accounts',
    'account_transactions',
    'income_records',
    'expense_records',
    'expense_categories',
    'groups',
    'group_members',
    'group_expenses',
    'debts',
    'debt_settlements',
    'friends',
    'friend_requests',
    'budgets',
    'planned_expenses',
    'recurring_expenses',
    'savings_goals',
    'savings_contributions',
    'sms_imported_transactions',
    'notification_settings',
    'app_settings',
    'transaction_attachments',
  ];

  for (const table of requiredTables) {
    if (!Array.isArray(memoryTables[table])) {
      memoryTables[table] = [];
    }
  }

  // Auto-repair any damaged user records from prior sessions
  if (Array.isArray(memoryTables['users'])) {
    memoryTables['users'].forEach((u) => {
      if (u && (u.is_active === undefined || u.is_active === null || typeof u.is_active === 'string')) {
        u.is_active = 1;
      }
    });
  }

  // Seed default categories if empty
  if (memoryTables['expense_categories'].length === 0) {
    const now = new Date().toISOString();
    DEFAULT_CATEGORIES.forEach((cat, index) => {
      memoryTables['expense_categories'].push({
        id: `cat_${index + 1}`,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        is_default: 1,
        created_at: now,
      });
    });
    await persistTablesToStorage();
  }

  // Seed default demo user (Abebe Kebede, 0911223344, password123) if no users exist
  if (memoryTables['users'].length === 0) {
    const demoSalt = 'EtHiOpIaSeEdSaLt';
    const demoHash = await hashPassword('password123', demoSalt);
    const demoUserId = 'user_seed_abebe';
    const now = new Date().toISOString();

    memoryTables['users'].push({
      id: demoUserId,
      phone: '0911223344',
      name: 'Abebe Kebede',
      email: 'abebe@example.com',
      password_hash: demoHash,
      salt: demoSalt,
      avatar: null,
      is_active: 1,
      created_at: now,
      updated_at: now,
    });

    memoryTables['user_profiles'].push({
      user_id: demoUserId,
      display_name: 'Abebe Kebede',
      phone: '0911223344',
      currency: 'ETB',
      calendar_preference: 'ethiopian',
      time_format: '12h',
      language: 'am',
      theme: 'system',
      biometric_enabled: 0,
      recovery_code: 'ETHIO-1234-5678-9012',
      avatar_url: null,
      updated_at: now,
    });

    memoryTables['financial_accounts'].push({
      id: 'acc_cash_seed',
      user_id: demoUserId,
      name: 'Pocket Cash',
      type: 'cash',
      institution: 'Cash',
      account_number: null,
      initial_balance: 1500,
      current_balance: 1500,
      currency: 'ETB',
      color: '#2E7D32',
      icon: 'cash',
      is_default: 1,
      is_archived: 0,
      notes: null,
      created_at: now,
      updated_at: now,
    });

    memoryTables['financial_accounts'].push({
      id: 'acc_cbe_seed',
      user_id: demoUserId,
      name: 'CBE Account',
      type: 'cbe',
      institution: 'Commercial Bank of Ethiopia',
      account_number: '100012345678',
      initial_balance: 5000,
      current_balance: 5000,
      currency: 'ETB',
      color: '#6A1B9A',
      icon: 'bank',
      is_default: 0,
      is_archived: 0,
      notes: null,
      created_at: now,
      updated_at: now,
    });

    await persistTablesToStorage();
  }

  isInitialized = true;
  return true;
}

export async function getDatabase() {
  await initLocalDatabase();
  return {
    execAsync: async (sql) => execute(sql),
    runAsync: async (sql, params = []) => execute(sql, params),
    getAllAsync: async (sql, params = []) => query(sql, params),
    getFirstAsync: async (sql, params = []) => queryOne(sql, params),
    withTransactionAsync: async (callback) => withTransaction(callback),
  };
}

/**
 * Evaluates row matching against SQL WHERE conditions
 */
function evaluateRow(row, whereClause, params, paramIndexTracker, allTables) {
  if (!whereClause || !whereClause.trim()) return true;

  let cleanWhere = whereClause.trim().replace(/;$/, '');

  // Subquery: WHERE group_id IN (SELECT id FROM groups WHERE created_by = ?)
  const subqueryMatch = cleanWhere.match(/([a-zA-Z0-9_]+)\s+IN\s+\(\s*SELECT\s+([a-zA-Z0-9_]+)\s+FROM\s+([a-zA-Z0-9_]+)\s+WHERE\s+([a-zA-Z0-9_]+)\s*=\s*\?\s*\)/i);
  if (subqueryMatch) {
    const colName = subqueryMatch[1];
    const subTargetCol = subqueryMatch[2];
    const subTable = subqueryMatch[3];
    const subWhereCol = subqueryMatch[4];
    const subParam = params[paramIndexTracker.index++];
    const subRows = (allTables[subTable] || []).filter((r) => String(r[subWhereCol]) === String(subParam));
    const allowedValues = subRows.map((r) => r[subTargetCol]);
    return allowedValues.includes(row[colName]);
  }

  // Parenthesized OR expression: (from_user_id = ? OR to_user_id = ?)
  const parenOrMatch = cleanWhere.match(/^\(\s*([a-zA-Z0-9_]+)\s*=\s*\?\s+OR\s+([a-zA-Z0-9_]+)\s*=\s*\?\s*\)(.*)$/i);
  if (parenOrMatch) {
    const col1 = parenOrMatch[1];
    const col2 = parenOrMatch[2];
    const remainder = parenOrMatch[3];
    const val1 = params[paramIndexTracker.index++];
    const val2 = params[paramIndexTracker.index++];
    const orResult = String(row[col1]) === String(val1) || String(row[col2]) === String(val2);

    if (!remainder || !remainder.trim()) return orResult;

    const andRemainder = remainder.trim().replace(/^AND\s+/i, '');
    return orResult && evaluateRow(row, andRemainder, params, paramIndexTracker, allTables);
  }

  // Handle standard conditions joined by AND
  const parts = cleanWhere.split(/\s+AND\s+/i);
  for (const part of parts) {
    const trimmed = part.trim().replace(/^\(|\)$/g, '');

    // Check for OR within condition: e.g. from_user_id = ? OR to_user_id = ?
    if (trimmed.includes(' OR ') || trimmed.includes(' or ')) {
      const orParts = trimmed.split(/\s+OR\s+/i);
      let anyOrTrue = false;
      for (const op of orParts) {
        if (evalSingleCondition(row, op.trim(), params, paramIndexTracker)) {
          anyOrTrue = true;
        }
      }
      if (!anyOrTrue) return false;
      continue;
    }

    if (!evalSingleCondition(row, trimmed, params, paramIndexTracker)) {
      return false;
    }
  }

  return true;
}

function evalSingleCondition(row, condition, params, paramIndexTracker) {
  const cleanCond = condition.trim().replace(/^\(|\)$/g, '');

  // col IS NULL / col IS NOT NULL
  if (/IS\s+NULL/i.test(cleanCond)) {
    const col = cleanCond.replace(/\s+IS\s+NULL/i, '').trim();
    return row[col] === null || row[col] === undefined;
  }
  if (/IS\s+NOT\s+NULL/i.test(cleanCond)) {
    const col = cleanCond.replace(/\s+IS\s+NOT\s+NULL/i, '').trim();
    return row[col] !== null && row[col] !== undefined;
  }

  // Binary operators: =, !=, <>, >=, <=, >, <, LIKE
  const opMatch = cleanCond.match(/^([a-zA-Z0-9_]+)\s*(=|!=|<>|>=|<=|>|<|LIKE)\s*(.*)$/i);
  if (!opMatch) return true;

  const col = opMatch[1].trim();
  const op = opMatch[2].toUpperCase();
  const valExpr = opMatch[3].trim();

  let targetVal;
  if (valExpr === '?') {
    targetVal = params[paramIndexTracker.index++];
  } else {
    // Literal value e.g. 1, 0, 'active', "accepted"
    targetVal = valExpr.replace(/^['"]|['"]$/g, '');
    if (!isNaN(targetVal) && targetVal !== '') targetVal = Number(targetVal);
  }

  const rowVal = row[col];

  switch (op) {
    case '=':
      if (typeof rowVal === 'boolean') {
        return (rowVal && (targetVal === 1 || targetVal === '1' || targetVal === 'true' || targetVal === true)) ||
               (!rowVal && (targetVal === 0 || targetVal === '0' || targetVal === 'false' || targetVal === false));
      }
      return String(rowVal) === String(targetVal) || Number(rowVal) === Number(targetVal);
    case '!=':
    case '<>':
      return String(rowVal) !== String(targetVal);
    case '>=':
      return Number(rowVal) >= Number(targetVal);
    case '<=':
      return Number(rowVal) <= Number(targetVal);
    case '>':
      return Number(rowVal) > Number(targetVal);
    case '<':
      return Number(rowVal) < Number(targetVal);
    case 'LIKE': {
      const regexStr = String(targetVal).replace(/%/g, '.*').replace(/_/g, '.');
      return new RegExp(`^${regexStr}$`, 'i').test(String(rowVal || ''));
    }
    default:
      return true;
  }
}

/**
 * Execute a SELECT query against the in-memory/localStorage database
 */
export async function query(sql, params = []) {
  if (!isInitialized) await initLocalDatabase();

  const cleanSql = sql.trim().replace(/;+$/, '');

  // 1. SELECT COUNT(*) as count FROM <table>
  const countMatch = cleanSql.match(/^SELECT\s+COUNT\(\*\)\s+(?:as\s+count\s+)?FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+([\s\S]+))?/i);
  if (countMatch) {
    const tableName = countMatch[1];
    const whereClause = countMatch[2];
    const rows = memoryTables[tableName] || [];
    if (!whereClause) {
      return [{ count: rows.length }];
    }
    const matching = rows.filter((r) => evaluateRow(r, whereClause, params, { index: 0 }, memoryTables));
    return [{ count: matching.length }];
  }

  // 2. Aggregate queries: SUM(amount) / COALESCE(SUM(amount), 0) / AVG(amount)
  const sumMatch = cleanSql.match(/^SELECT\s+(?:COALESCE\(\s*)?SUM\(([a-zA-Z0-9_]+)\)(?:,\s*0\))?\s+(?:as\s+([a-zA-Z0-9_]+)\s+)?FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+([\s\S]+))?/i);
  if (sumMatch) {
    const sumCol = sumMatch[1];
    const alias = sumMatch[2] || 'sum';
    const tableName = sumMatch[3];
    const whereClause = sumMatch[4];
    const rows = memoryTables[tableName] || [];
    const matching = whereClause
      ? rows.filter((r) => evaluateRow(r, whereClause, params, { index: 0 }, memoryTables))
      : rows;
    const total = matching.reduce((acc, curr) => acc + (Number(curr[sumCol]) || 0), 0);
    return [{ [alias]: total }];
  }

  // 3. GROUP BY queries: SELECT type, SUM(amount) as total FROM <table> WHERE ... GROUP BY type
  const groupByMatch = cleanSql.match(/^SELECT\s+([a-zA-Z0-9_]+),\s*(?:COALESCE\(\s*)?SUM\(([a-zA-Z0-9_]+)\)(?:,\s*0\))?\s+(?:as\s+([a-zA-Z0-9_]+)\s+)?FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+([\s\S]+?))?\s+GROUP\s+BY\s+([a-zA-Z0-9_]+)/i);
  if (groupByMatch) {
    const groupCol = groupByMatch[1];
    const sumCol = groupByMatch[2];
    const alias = groupByMatch[3] || 'total';
    const tableName = groupByMatch[4];
    const whereClause = groupByMatch[5];
    const rows = memoryTables[tableName] || [];
    const matching = whereClause
      ? rows.filter((r) => evaluateRow(r, whereClause, params, { index: 0 }, memoryTables))
      : rows;

    const grouped = {};
    for (const r of matching) {
      const key = r[groupCol];
      grouped[key] = (grouped[key] || 0) + (Number(r[sumCol]) || 0);
    }
    return Object.entries(grouped).map(([key, val]) => ({ [groupCol]: key, [alias]: val }));
  }

  // 4. Standard SELECT [cols] FROM <table> [WHERE ...] [ORDER BY ...] [LIMIT ...]
  const selectMatch = cleanSql.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+([\s\S]+?))?(?:\s+ORDER\s+BY\s+([\s\S]+?))?(?:\s+LIMIT\s+([0-9?]+))?(?:\s+OFFSET\s+([0-9?]+))?$/i);
  if (!selectMatch) {
    return [];
  }

  const selectedColsStr = selectMatch[1].trim();
  const tableName = selectMatch[2].trim();
  const whereClause = selectMatch[3];
  const orderByClause = selectMatch[4];
  const limitClause = selectMatch[5];

  const rows = memoryTables[tableName] || [];

  const paramTracker = { index: 0 };
  let result = whereClause
    ? rows.filter((r) => evaluateRow(r, whereClause, params, paramTracker, memoryTables))
    : [...rows];

  // ORDER BY
  if (orderByClause) {
    const orderDirectives = orderByClause.split(',').map((d) => d.trim());
    result.sort((a, b) => {
      for (const directive of orderDirectives) {
        const [col, dir = 'ASC'] = directive.split(/\s+/);
        const aVal = a[col];
        const bVal = b[col];
        const isDesc = dir.toUpperCase() === 'DESC';

        if (aVal === bVal) continue;
        if (aVal === undefined || aVal === null) return isDesc ? 1 : -1;
        if (bVal === undefined || bVal === null) return isDesc ? -1 : 1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return isDesc ? bVal - aVal : aVal - bVal;
        }
        const cmp = String(aVal).localeCompare(String(bVal));
        return isDesc ? -cmp : cmp;
      }
      return 0;
    });
  }

  // LIMIT
  if (limitClause) {
    let limitNum = Number(limitClause);
    if (isNaN(limitNum) && limitClause === '?') {
      limitNum = Number(params[paramTracker.index++]);
    }
    if (!isNaN(limitNum)) {
      result = result.slice(0, limitNum);
    }
  }

  // Project columns if not SELECT *
  if (selectedColsStr !== '*') {
    const requestedCols = selectedColsStr.split(',').map((c) => c.trim().split(/\s+as\s+/i)[0].trim());
    return result.map((r) => {
      const projected = {};
      for (const col of requestedCols) {
        projected[col] = r[col];
      }
      return projected;
    });
  }

  return result.map((r) => ({ ...r }));
}

/**
 * Execute a query returning the first matching row or null
 */
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

/**
 * Safely parse comma-separated tokens inside VALUES(...) handling single and double quotes
 */
function parseValuesTokens(valuesStr) {
  const tokens = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    if ((char === "'" || char === '"') && valuesStr[i - 1] !== '\\') {
      if (!inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inQuotes = false;
      }
      current += char;
    } else if (char === ',' && !inQuotes) {
      tokens.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    tokens.push(current.trim());
  }
  return tokens;
}

/**
 * Execute an INSERT, UPDATE, DELETE, or DDL statement
 */
export async function execute(sql, params = []) {
  if (!isInitialized) await initLocalDatabase();

  const cleanSql = sql.trim().replace(/;+$/, '');

  // 1. DDL: CREATE TABLE / CREATE INDEX / PRAGMA
  if (/^(CREATE|PRAGMA|BEGIN|COMMIT|ROLLBACK)/i.test(cleanSql)) {
    const createTableMatch = cleanSql.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)/i);
    if (createTableMatch) {
      const tableName = createTableMatch[1];
      if (!Array.isArray(memoryTables[tableName])) {
        memoryTables[tableName] = [];
      }
    }
    return { changes: 0, lastInsertRowId: 0 };
  }

  // 2. INSERT INTO / INSERT OR REPLACE INTO
  const insertMatch = cleanSql.match(/^(?:INSERT\s+INTO|INSERT\s+OR\s+REPLACE\s+INTO)\s+([a-zA-Z0-9_]+)\s*\(([\s\S]+?)\)\s*VALUES\s*\(([\s\S]+?)\)$/i);
  if (insertMatch) {
    const tableName = insertMatch[1];
    const cols = insertMatch[2].split(',').map((c) => c.trim());
    if (!Array.isArray(memoryTables[tableName])) {
      memoryTables[tableName] = [];
    }

    const valTokens = parseValuesTokens(insertMatch[3]);
    let paramIdx = 0;
    const newRow = {};
    cols.forEach((col, idx) => {
      const token = valTokens[idx];
      if (token === '?') {
        newRow[col] = params[paramIdx++] !== undefined ? params[paramIdx - 1] : null;
      } else if (token === undefined) {
        newRow[col] = null;
      } else if (/^null$/i.test(token)) {
        newRow[col] = null;
      } else if (/^['"].*['"]$/.test(token)) {
        newRow[col] = token.slice(1, -1);
      } else if (!isNaN(Number(token))) {
        newRow[col] = Number(token);
      } else {
        newRow[col] = token;
      }
    });

    const isReplace = /OR\s+REPLACE/i.test(cleanSql);
    const existingIndex = newRow.id
      ? memoryTables[tableName].findIndex((r) => r.id === newRow.id)
      : -1;

    if (existingIndex >= 0 && isReplace) {
      memoryTables[tableName][existingIndex] = { ...memoryTables[tableName][existingIndex], ...newRow };
    } else {
      memoryTables[tableName].push(newRow);
    }

    await persistTablesToStorage();
    return { changes: 1, lastInsertRowId: newRow.id || memoryTables[tableName].length };
  }

  // 3. UPDATE <table> SET <assignments> [WHERE <where>]
  const updateMatch = cleanSql.match(/^UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+([\s\S]+?)(?:\s+WHERE\s+([\s\S]+))?$/i);
  if (updateMatch) {
    const tableName = updateMatch[1];
    const assignmentsStr = updateMatch[2];
    const whereClause = updateMatch[3];

    const rows = memoryTables[tableName] || [];
    let paramIndex = 0;

    // Parse assignments: e.g. "is_default = 0" or "current_balance = current_balance - ?"
    const assignments = assignmentsStr.split(',').map((a) => a.trim());
    const compiledAssignments = assignments.map((assign) => {
      const mathSubMatch = assign.match(/^([a-zA-Z0-9_]+)\s*=\s*\1\s*-\s*\?$/i);
      if (mathSubMatch) {
        const val = params[paramIndex++];
        return (row) => {
          row[mathSubMatch[1]] = (Number(row[mathSubMatch[1]]) || 0) - Number(val);
        };
      }
      const mathAddMatch = assign.match(/^([a-zA-Z0-9_]+)\s*=\s*\1\s*\+\s*\?$/i);
      if (mathAddMatch) {
        const val = params[paramIndex++];
        return (row) => {
          row[mathAddMatch[1]] = (Number(row[mathAddMatch[1]]) || 0) + Number(val);
        };
      }
      const paramAssignMatch = assign.match(/^([a-zA-Z0-9_]+)\s*=\s*\?$/);
      if (paramAssignMatch) {
        const val = params[paramIndex++];
        return (row) => {
          row[paramAssignMatch[1]] = val;
        };
      }
      const coalesceMatch = assign.match(/^([a-zA-Z0-9_]+)\s*=\s*COALESCE\(\s*\?\s*,\s*([a-zA-Z0-9_]+)\s*\)$/i);
      if (coalesceMatch) {
        const targetCol = coalesceMatch[1];
        const fallbackCol = coalesceMatch[2];
        const val = params[paramIndex++];
        return (row) => {
          if (val !== null && val !== undefined) {
            row[targetCol] = val;
          } else if (fallbackCol && row[fallbackCol] !== undefined) {
            row[targetCol] = row[fallbackCol];
          }
        };
      }
      const literalAssignMatch = assign.match(/^([a-zA-Z0-9_]+)\s*=\s*(.+)$/);
      if (literalAssignMatch) {
        const rawVal = literalAssignMatch[2].trim().replace(/^['"]|['"]$/g, '');
        const val = !isNaN(rawVal) && rawVal !== '' ? Number(rawVal) : rawVal;
        return (row) => {
          row[literalAssignMatch[1]] = val;
        };
      }
      return () => {};
    });

    // Evaluate WHERE conditions using remaining params
    let changes = 0;
    for (const r of rows) {
      if (evaluateRow(r, whereClause, params, { index: paramIndex }, memoryTables)) {
        compiledAssignments.forEach((fn) => fn(r));
        changes++;
      }
    }

    await persistTablesToStorage();
    return { changes, lastInsertRowId: 0 };
  }

  // 4. DELETE FROM <table> [WHERE <where>]
  const deleteMatch = cleanSql.match(/^DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+([\s\S]+))?$/i);
  if (deleteMatch) {
    const tableName = deleteMatch[1];
    const whereClause = deleteMatch[2];
    const rows = memoryTables[tableName] || [];

    if (!whereClause) {
      const count = rows.length;
      memoryTables[tableName] = [];
      await persistTablesToStorage();
      return { changes: count, lastInsertRowId: 0 };
    }

    const remainingRows = [];
    let changes = 0;
    for (const r of rows) {
      if (evaluateRow(r, whereClause, params, { index: 0 }, memoryTables)) {
        changes++;
      } else {
        remainingRows.push(r);
      }
    }

    memoryTables[tableName] = remainingRows;
    await persistTablesToStorage();
    return { changes, lastInsertRowId: 0 };
  }

  return { changes: 0, lastInsertRowId: 0 };
}

/**
 * Execute callback within an atomic transaction
 */
export async function withTransaction(callback) {
  if (!isInitialized) await initLocalDatabase();

  const backupState = JSON.stringify(memoryTables);
  try {
    const result = await callback({
      execAsync: async (sql) => execute(sql),
      runAsync: async (sql, params = []) => execute(sql, params),
      getAllAsync: async (sql, params = []) => query(sql, params),
      getFirstAsync: async (sql, params = []) => queryOne(sql, params),
    });
    await persistTablesToStorage();
    return result;
  } catch (error) {
    memoryTables = JSON.parse(backupState);
    throw error;
  }
}

export default {
  getDatabase,
  initLocalDatabase,
  query,
  queryOne,
  execute,
  withTransaction,
};
