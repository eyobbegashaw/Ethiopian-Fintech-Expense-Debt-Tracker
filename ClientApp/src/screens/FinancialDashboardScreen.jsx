import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useTheme, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useAppDate } from '../utils/dateUtils';
import { financeService } from '../services/financeService';
import { accountService } from '../services/accountService';
import { budgetService } from '../services/budgetService';
import { plannedExpenseService } from '../services/plannedExpenseService';
import { savingsGoalService } from '../services/savingsGoalService';
import { smsService } from '../services/smsService';

// Modals
import AddIncomeModal from '../components/Finance/AddIncomeModal';
import AddPersonalExpenseModal from '../components/Finance/AddPersonalExpenseModal';
import TransferModal from '../components/Finance/TransferModal';
import AddAccountModal from '../components/Finance/AddAccountModal';

const FinancialDashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();
  const { user } = useAuth();
  const { formatDate, todayBanner } = useAppDate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [plannedExpenses, setPlannedExpenses] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);
  const [unverifiedSmsCount, setUnverifiedSmsCount] = useState(0);

  // Modal visibility
  const [incomeModalVisible, setIncomeModalVisible] = useState(false);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [accountModalVisible, setAccountModalVisible] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [
        summaryRes,
        accountsRes,
        budgetsRes,
        plannedRes,
        savingsRes,
        smsRes,
      ] = await Promise.all([
        financeService.getTransactionSummary().catch(() => ({ data: null })),
        accountService.getAccounts().catch(() => ({ data: [] })),
        budgetService.getBudgets().catch(() => ({ data: [] })),
        plannedExpenseService.getPlannedExpenses({ status: 'upcoming' }).catch(() => ({ data: [] })),
        savingsGoalService.getSavingsGoals().catch(() => ({ data: [] })),
        smsService.getUnverified().catch(() => ({ data: [] })),
      ]);

      setSummary(summaryRes?.data || null);
      setAccounts(Array.isArray(accountsRes?.data) ? accountsRes.data : []);
      setBudgets(Array.isArray(budgetsRes?.data) ? budgetsRes.data : []);
      setPlannedExpenses(Array.isArray(plannedRes?.data) ? plannedRes.data : []);
      setSavingsGoals(Array.isArray(savingsRes?.data) ? savingsRes.data : []);
      setUnverifiedSmsCount(Array.isArray(smsRes?.data) ? smsRes.data.length : 0);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const totalWealth = summary?.totalWealth || accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
  const currentMonth = summary?.currentMonth || { income: 0, expense: 0, netCashFlow: 0 };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header & Date Banner */}
        <View style={styles.topHeaderRow}>
          <View style={styles.greetingWrap}>
            <Text style={[styles.greetingSub, { color: theme.dark ? '#AAA' : '#666' }]}>
              {isAmharic ? 'የፋይናንስ ማዕከል' : 'Financial Hub'}
            </Text>
            <Text style={[styles.userNameText, { color: theme.dark ? '#FFF' : '#222' }]}>
              {user?.name || 'User'} 👋
            </Text>
          </View>
          <View style={[styles.dateBadge, { backgroundColor: theme.dark ? '#1B381E' : '#E8F5E9' }]}>
            <Icon name="calendar-month-outline" size={13} color={theme.colors.primary} />
            <Text style={[styles.dateBadgeText, { color: theme.colors.primary }]}>
              {todayBanner}
            </Text>
          </View>
        </View>

        {/* Total Wealth / Net Worth Hero Card */}
        <View style={[styles.wealthCard, { backgroundColor: theme.colors.primary }]}>
          <View style={styles.wealthCardHeader}>
            <Text style={styles.wealthLabel}>{t('net_worth')}</Text>
            <TouchableOpacity
              style={styles.reportsChip}
              onPress={() => navigation.navigate('Reports')}
            >
              <Icon name="chart-pie" size={14} color="#FFF" />
              <Text style={styles.reportsChipText}>{t('reports')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.wealthAmount}>
            {totalWealth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
          </Text>

          {/* Transparent Bank Balance Disclaimer */}
          <View style={styles.disclaimerRow}>
            <Icon name="information-outline" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.disclaimerText}>
              {t('disclaimer_balance')}
            </Text>
          </View>

          {/* Income vs Expense Mini Stats */}
          <View style={styles.wealthStatsRow}>
            <View style={styles.miniStatBox}>
              <View style={styles.miniStatHeader}>
                <Icon name="arrow-down-circle" size={14} color="#81C784" />
                <Text style={styles.miniStatLabel}>{t('income')}</Text>
              </View>
              <Text style={styles.miniStatValue}>
                +{currentMonth.income.toLocaleString()} ETB
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.miniStatBox}>
              <View style={styles.miniStatHeader}>
                <Icon name="arrow-up-circle" size={14} color="#FF8A80" />
                <Text style={styles.miniStatLabel}>{t('expenses')}</Text>
              </View>
              <Text style={styles.miniStatValue}>
                -{currentMonth.expense.toLocaleString()} ETB
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.miniStatBox}>
              <View style={styles.miniStatHeader}>
                <Icon name="scale-balance" size={14} color="#FFE082" />
                <Text style={styles.miniStatLabel}>{t('net_cash_flow')}</Text>
              </View>
              <Text style={[styles.miniStatValue, { color: currentMonth.netCashFlow >= 0 ? '#C8E6C9' : '#FFCDD2' }]}>
                {currentMonth.netCashFlow >= 0 ? '+' : ''}{currentMonth.netCashFlow.toLocaleString()} ETB
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Shortcuts */}
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.surface }]}
            onPress={() => setIncomeModalVisible(true)}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#E8F5E9' }]}>
              <Icon name="plus-circle" size={22} color="#2E7D32" />
            </View>
            <Text style={[styles.actionBtnText, { color: theme.dark ? '#FFF' : '#333' }]}>
              {t('add_income')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.surface }]}
            onPress={() => setExpenseModalVisible(true)}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#FFEBEE' }]}>
              <Icon name="minus-circle" size={22} color="#D32F2F" />
            </View>
            <Text style={[styles.actionBtnText, { color: theme.dark ? '#FFF' : '#333' }]}>
              {t('add_personal_expense')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.surface }]}
            onPress={() => setTransferModalVisible(true)}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#E3F2FD' }]}>
              <Icon name="swap-horizontal" size={22} color="#1976D2" />
            </View>
            <Text style={[styles.actionBtnText, { color: theme.dark ? '#FFF' : '#333' }]}>
              {t('transfer')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.colors.surface }]}
            onPress={() => navigation.navigate('SMSTransactions')}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: '#FFF3E0' }]}>
              <Icon name="message-processing-outline" size={22} color="#F57C00" />
              {unverifiedSmsCount > 0 && (
                <View style={styles.smsBadge}>
                  <Text style={styles.smsBadgeText}>{unverifiedSmsCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.actionBtnText, { color: theme.dark ? '#FFF' : '#333' }]}>
              {t('sms_transactions')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Accounts Carousel / Slider Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <Icon name="wallet" size={20} color={theme.colors.primary} />
            <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : '#222' }]}>
              {t('my_accounts')} ({accounts.length})
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Accounts')}>
            <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
              {t('view_all')} →
            </Text>
          </TouchableOpacity>
        </View>

        {accounts.length === 0 ? (
          <TouchableOpacity
            style={[styles.emptyAccountCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => setAccountModalVisible(true)}
          >
            <Icon name="bank-plus" size={32} color={theme.colors.primary} />
            <Text style={[styles.emptyAccountText, { color: theme.colors.primary }]}>
              + {t('add_account')} (CBE, TeleBirr, Cash...)
            </Text>
          </TouchableOpacity>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc._id}
                style={[
                  styles.accountCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: acc.isDefault ? theme.colors.primary : (theme.dark ? '#333' : '#E8E8E8'),
                  },
                ]}
                onPress={() => navigation.navigate('Accounts')}
              >
                <View style={styles.accountCardTop}>
                  <View style={[styles.accountIconBox, { backgroundColor: `${acc.color || '#2E7D32'}20` }]}>
                    <Icon name={acc.icon || 'bank'} size={20} color={acc.color || '#2E7D32'} />
                  </View>
                  {acc.isDefault && (
                    <View style={styles.defaultPill}>
                      <Text style={styles.defaultPillText}>Default</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.accountName, { color: theme.dark ? '#FFF' : '#222' }]} numberOfLines={1}>
                  {acc.name}
                </Text>
                <Text style={[styles.accountBalance, { color: theme.dark ? '#81C784' : '#2E7D32' }]}>
                  {acc.balance.toLocaleString()} {acc.currency}
                </Text>
                <Text style={[styles.accountSub, { color: theme.dark ? '#888' : '#999' }]} numberOfLines={1}>
                  {acc.institution}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.addAccountSmallCard, { backgroundColor: theme.colors.surface }]}
              onPress={() => setAccountModalVisible(true)}
            >
              <Icon name="plus" size={24} color={theme.colors.primary} />
              <Text style={[styles.addAccountSmallText, { color: theme.colors.primary }]}>
                {t('add')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Budgets Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <Icon name="chart-bell-curve-cumulative" size={20} color="#F57C00" />
            <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : '#222' }]}>
              {t('budgets')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Budgets')}>
            <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
              {t('view_all')} →
            </Text>
          </TouchableOpacity>
        </View>

        {budgets.length === 0 ? (
          <TouchableOpacity
            style={[styles.emptyWidgetCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => navigation.navigate('Budgets')}
          >
            <Text style={[styles.emptyWidgetText, { color: theme.dark ? '#AAA' : '#777' }]}>
              {isAmharic ? 'ምንም በጀት አልተዘጋጀም። ወጪዎን ለመቆጣጠር በጀት ያዘጋጁ።' : 'No active budgets. Set a monthly budget to track spending.'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.widgetCard, { backgroundColor: theme.colors.surface }]}>
            {budgets.slice(0, 2).map((b) => {
              const barColor = b.status === 'exceeded' ? '#D32F2F' : b.status === 'warning' ? '#F57C00' : '#2E7D32';
              return (
                <View key={b._id} style={styles.budgetItem}>
                  <View style={styles.budgetHeader}>
                    <Text style={[styles.budgetName, { color: theme.dark ? '#FFF' : '#222' }]}>{b.name}</Text>
                    <Text style={[styles.budgetPercent, { color: barColor }]}>
                      {b.percentage}% ({b.spent.toLocaleString()} / {b.amount.toLocaleString()} ETB)
                    </Text>
                  </View>
                  <View style={[styles.progressBarTrack, { backgroundColor: theme.dark ? '#333' : '#E0E0E0' }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, b.percentage)}%`,
                          backgroundColor: barColor,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Scheduled Bills (Planned Expenses) Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <Icon name="calendar-clock" size={20} color="#1976D2" />
            <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : '#222' }]}>
              {t('planned_expenses')} ({plannedExpenses.length})
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('PlannedExpenses')}>
            <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
              {t('view_all')} →
            </Text>
          </TouchableOpacity>
        </View>

        {plannedExpenses.length === 0 ? (
          <TouchableOpacity
            style={[styles.emptyWidgetCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => navigation.navigate('PlannedExpenses')}
          >
            <Text style={[styles.emptyWidgetText, { color: theme.dark ? '#AAA' : '#777' }]}>
              {isAmharic ? 'ምንም የታቀደ ክፍያ የለም። የኪራይ ወይም የቢል ክፍያዎችን አስቀድመው ያቅዱ።' : 'No upcoming bills. Schedule rent, equb, or utilities.'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.widgetCard, { backgroundColor: theme.colors.surface }]}>
            {plannedExpenses.slice(0, 2).map((item) => (
              <View key={item._id} style={styles.billItem}>
                <View style={styles.billLeft}>
                  <Text style={[styles.billTitle, { color: theme.dark ? '#FFF' : '#222' }]}>{item.title}</Text>
                  <Text style={[styles.billDueDate, { color: theme.dark ? '#AAA' : '#888' }]}>
                    {t('due_date')}: {formatDate(item.dueDate)}
                  </Text>
                </View>
                <View style={styles.billRight}>
                  <Text style={[styles.billAmount, { color: '#D32F2F' }]}>
                    {item.amount.toLocaleString()} ETB
                  </Text>
                  <TouchableOpacity
                    style={[styles.payChip, { backgroundColor: theme.colors.primary }]}
                    onPress={() => navigation.navigate('PlannedExpenses')}
                  >
                    <Text style={styles.payChipText}>{t('mark_as_paid')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Savings Goals Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <Icon name="piggy-bank" size={20} color="#6A1B9A" />
            <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : '#222' }]}>
              {t('savings_goals')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('SavingsGoals')}>
            <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
              {t('view_all')} →
            </Text>
          </TouchableOpacity>
        </View>

        {savingsGoals.length === 0 ? (
          <TouchableOpacity
            style={[styles.emptyWidgetCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => navigation.navigate('SavingsGoals')}
          >
            <Text style={[styles.emptyWidgetText, { color: theme.dark ? '#AAA' : '#777' }]}>
              {isAmharic ? 'የቁጠባ ግብ አልተፈጠረም። ለድንገተኛ አደጋ ወይም ለዕቅድዎ ይቆጥቡ።' : 'No savings goals set. Create a goal to start saving.'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.widgetCard, { backgroundColor: theme.colors.surface }]}>
            {savingsGoals.slice(0, 2).map((goal) => {
              const progress = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100)) : 0;
              return (
                <View key={goal._id} style={styles.budgetItem}>
                  <View style={styles.budgetHeader}>
                    <Text style={[styles.budgetName, { color: theme.dark ? '#FFF' : '#222' }]}>{goal.title}</Text>
                    <Text style={[styles.budgetPercent, { color: '#6A1B9A' }]}>
                      {progress}% ({goal.currentAmount.toLocaleString()} / {goal.targetAmount.toLocaleString()} ETB)
                    </Text>
                  </View>
                  <View style={[styles.progressBarTrack, { backgroundColor: theme.dark ? '#333' : '#E0E0E0' }]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${progress}%`,
                          backgroundColor: '#6A1B9A',
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recent Transactions Section */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWrap}>
            <Icon name="history" size={20} color={theme.dark ? '#FFF' : '#333'} />
            <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : '#222' }]}>
              {isAmharic ? 'የቅርብ ጊዜ እንቅስቃሴዎች' : 'Recent Transactions'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Reports')}>
            <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
              {t('view_all')} →
            </Text>
          </TouchableOpacity>
        </View>

        {summary?.recentTransactions?.length > 0 ? (
          <View style={[styles.widgetCard, { backgroundColor: theme.colors.surface }]}>
            {summary.recentTransactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const isTransfer = tx.type === 'transfer';
              const iconName = isIncome ? 'arrow-down-bold' : isTransfer ? 'swap-horizontal' : 'arrow-up-bold';
              const iconColor = isIncome ? '#2E7D32' : isTransfer ? '#1976D2' : '#D32F2F';

              return (
                <View key={tx._id} style={styles.transactionRow}>
                  <View style={[styles.txIconCircle, { backgroundColor: `${iconColor}18` }]}>
                    <Icon name={iconName} size={18} color={iconColor} />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={[styles.txDesc, { color: theme.dark ? '#FFF' : '#222' }]} numberOfLines={1}>
                      {tx.description}
                    </Text>
                    <Text style={[styles.txMeta, { color: theme.dark ? '#AAA' : '#888' }]}>
                      {tx.accountId?.name || 'Account'} • {formatDate(tx.date, { includeTime: true })}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, { color: iconColor }]}>
                    {isIncome ? '+' : isTransfer ? '' : '-'}{tx.amount.toLocaleString()} ETB
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyWidgetCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.emptyWidgetText, { color: theme.dark ? '#AAA' : '#777' }]}>
              {isAmharic ? 'እስካሁን ምንም ግብይት አልተመዘገበም' : 'No transactions recorded yet'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <AddIncomeModal
        visible={incomeModalVisible}
        onClose={() => setIncomeModalVisible(false)}
        onSuccess={loadDashboardData}
        accounts={accounts}
      />

      <AddPersonalExpenseModal
        visible={expenseModalVisible}
        onClose={() => setExpenseModalVisible(false)}
        onSuccess={loadDashboardData}
        accounts={accounts}
      />

      <TransferModal
        visible={transferModalVisible}
        onClose={() => setTransferModalVisible(false)}
        onSuccess={loadDashboardData}
        accounts={accounts}
      />

      <AddAccountModal
        visible={accountModalVisible}
        onClose={() => setAccountModalVisible(false)}
        onSuccess={loadDashboardData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  topHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greetingWrap: {
    flex: 1,
  },
  greetingSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  wealthCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    ...Platform.select({
      web: { boxShadow: '0 4px 16px rgba(46, 125, 50, 0.25)' },
      default: { elevation: 4 },
    }),
  },
  wealthCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  wealthLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  reportsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  reportsChipText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  wealthAmount: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 14,
  },
  disclaimerText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    flex: 1,
  },
  wealthStatsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniStatBox: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  miniStatLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '600',
  },
  miniStatValue: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 14,
    ...Platform.select({
      web: { boxShadow: '0 2px 6px rgba(0,0,0,0.04)' },
      default: { elevation: 2 },
    }),
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  smsBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#D32F2F',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smsBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  accountsScroll: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  accountCard: {
    width: 140,
    borderRadius: 16,
    padding: 12,
    marginRight: 10,
    borderWidth: 1.5,
  },
  accountCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  accountIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  defaultPillText: {
    fontSize: 9,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  accountName: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  accountSub: {
    fontSize: 10,
  },
  addAccountSmallCard: {
    width: 70,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#2E7D32',
    marginRight: 10,
  },
  addAccountSmallText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 4,
  },
  emptyAccountCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#2E7D32',
  },
  emptyAccountText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  widgetCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  emptyWidgetCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyWidgetText: {
    fontSize: 13,
    textAlign: 'center',
  },
  budgetItem: {
    marginBottom: 12,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  budgetName: {
    fontSize: 13,
    fontWeight: '600',
  },
  budgetPercent: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  billLeft: {
    flex: 1,
  },
  billTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  billDueDate: {
    fontSize: 11,
    marginTop: 2,
  },
  billRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  billAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  payChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  payChipText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  transactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  txIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: 13,
    fontWeight: '600',
  },
  txMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default FinancialDashboardScreen;
