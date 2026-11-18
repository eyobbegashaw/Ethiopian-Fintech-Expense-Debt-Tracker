import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme, ActivityIndicator, FAB } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppDate } from '../utils/dateUtils';
import { plannedExpenseService } from '../services/plannedExpenseService';
import { accountService } from '../services/accountService';

const RECURRENCE_OPTIONS = [
  { id: 'none', label: 'One-time' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
];

const PlannedExpensesScreen = ({ navigation }) => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();
  const { formatDate } = useAppDate();

  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Planned Expense Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [recurrence, setRecurrence] = useState('monthly');
  const [dueDateDays, setDueDateDays] = useState('7'); // days from today
  const [submitting, setSubmitting] = useState(false);

  // Pay Modal
  const [payModalVisible, setPayModalVisible] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [paying, setPaying] = useState(false);

  const loadData = async () => {
    try {
      const [plannedRes, accountsRes] = await Promise.all([
        plannedExpenseService.getPlannedExpenses({ status: filter }),
        accountService.getAccounts().catch(() => ({ data: [] })),
      ]);

      if (plannedRes?.data) setExpenses(plannedRes.data);
      if (accountsRes?.data) {
        setAccounts(accountsRes.data);
        if (!paymentAccountId && accountsRes.data[0]) {
          setPaymentAccountId(accountsRes.data[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching planned expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [filter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreatePlanned = async () => {
    if (!title.trim() || !amount || isNaN(amount) || Number(amount) <= 0) {
      Alert.alert(t('error'), 'Please enter a valid title and amount');
      return;
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (parseInt(dueDateDays, 10) || 7));

    setSubmitting(true);
    try {
      await plannedExpenseService.createPlannedExpense({
        title: title.trim(),
        amount: Number(amount),
        category,
        dueDate: targetDate,
        recurrence,
      });

      setTitle('');
      setAmount('');
      setCreateModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert(t('error'), error.response?.data?.message || 'Failed to schedule bill');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenPayModal = (item) => {
    setSelectedExpense(item);
    setPayModalVisible(true);
  };

  const handleConfirmPay = async () => {
    if (!selectedExpense || !paymentAccountId) {
      Alert.alert(t('error'), 'Please select payment account');
      return;
    }

    setPaying(true);
    try {
      await plannedExpenseService.markAsPaid(selectedExpense._id, {
        accountId: paymentAccountId,
      });

      setPayModalVisible(false);
      setSelectedExpense(null);
      loadData();
    } catch (error) {
      Alert.alert(t('error'), error.response?.data?.message || 'Payment recording failed');
    } finally {
      setPaying(false);
    }
  };

  const renderExpenseItem = ({ item }) => {
    const isOverdue = !item.isPaid && new Date(item.dueDate) < new Date();
    const statusColor = item.isPaid ? '#2E7D32' : isOverdue ? '#D32F2F' : '#F57C00';
    const statusText = item.isPaid ? t('is_paid') : isOverdue ? t('overdue') : t('upcoming');

    return (
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: theme.dark ? '#FFF' : '#222' }]}>{item.title}</Text>
            <Text style={[styles.categoryText, { color: theme.dark ? '#AAA' : '#777' }]}>
              {item.category} • {item.recurrence.toUpperCase()}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.dateRow}>
            <Icon name="calendar-outline" size={15} color={theme.dark ? '#AAA' : '#666'} />
            <Text style={[styles.dateText, { color: theme.dark ? '#AAA' : '#666' }]}>
              {t('due_date')}: {formatDate(item.dueDate)}
            </Text>
          </View>

          <Text style={[styles.amountText, { color: statusColor }]}>
            {item.amount.toLocaleString()} ETB
          </Text>
        </View>

        {!item.isPaid && (
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => handleOpenPayModal(item)}
          >
            <Icon name="check-circle" size={16} color="#FFF" />
            <Text style={styles.payButtonText}>{t('mark_as_paid')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {['all', 'upcoming', 'overdue', 'paid'].map((f) => {
          const isSelected = filter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primary
                    : (theme.dark ? '#2A2A2A' : '#F0F0F0'),
                },
              ]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: isSelected ? '#FFF' : (theme.dark ? '#DDD' : '#555') },
                ]}
              >
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item._id}
        renderItem={renderExpenseItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="calendar-check-outline" size={64} color="#999" />
            <Text style={[styles.emptyText, { color: theme.dark ? '#AAA' : '#888' }]}>
              {isAmharic ? 'ምንም የታቀደ ክፍያ የለም' : 'No planned bills found'}
            </Text>
          </View>
        }
      />

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => setCreateModalVisible(true)}
      />

      {/* Schedule Bill Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFF' : '#222' }]}>
                {t('schedule_bill')}
              </Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#AAA' : '#666'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                {isAmharic ? 'የክፍያው ርዕስ' : 'Bill Title'} *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                    color: theme.dark ? '#FFF' : '#000',
                  },
                ]}
                placeholder={isAmharic ? 'ለምሳሌ፡ የቤት ኪራይ፣ ኢንተርኔት' : 'e.g. Rent, Internet, School fee'}
                placeholderTextColor="#999"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                {isAmharic ? 'መጠን (ብር)' : 'Amount (ETB)'} *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                    color: theme.dark ? '#FFF' : '#000',
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />

              <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                {isAmharic ? 'የመክፈያ ቀን (ከዛሬ ጀምሮ ባሉት ቀናት)' : 'Due in (Days from today)'}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                    color: theme.dark ? '#FFF' : '#000',
                  },
                ]}
                placeholder="7"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={dueDateDays}
                onChangeText={setDueDateDays}
              />

              <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                {isAmharic ? 'የመደጋገም ሁኔታ' : 'Recurrence'}
              </Text>
              <View style={styles.recurrenceRow}>
                {RECURRENCE_OPTIONS.map((opt) => {
                  const isSelected = recurrence === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : (theme.dark ? '#2A2A2A' : '#F0F0F0'),
                        },
                      ]}
                      onPress={() => setRecurrence(opt.id)}
                    >
                      <Text style={[styles.chipText, { color: isSelected ? '#FFF' : (theme.dark ? '#DDD' : '#333') }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCreatePlanned}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{t('save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pay Modal */}
      <Modal visible={payModalVisible} animationType="slide" transparent onRequestClose={() => setPayModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFF' : '#222' }]}>
                {t('mark_as_paid')}
              </Text>
              <TouchableOpacity onPress={() => setPayModalVisible(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#AAA' : '#666'} />
              </TouchableOpacity>
            </View>

            {selectedExpense && (
              <View style={styles.payPromptWrap}>
                <Text style={[styles.payPromptText, { color: theme.dark ? '#DDD' : '#444' }]}>
                  {isAmharic ? 'ክፍያውን የፈጸሙበትን ሒሳብ ይምረጡ። ከተመረጠው ሒሳብ ላይ ይቀነሳል።' : 'Select the account used to pay this bill. The balance will be updated.'}
                </Text>
                <Text style={[styles.payAmountHighlight, { color: theme.colors.primary }]}>
                  {selectedExpense.title}: {selectedExpense.amount.toLocaleString()} ETB
                </Text>

                <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555', marginTop: 14 }]}>
                  {t('source_account')} *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  {accounts.map((acc) => {
                    const isSelected = paymentAccountId === acc._id;
                    return (
                      <TouchableOpacity
                        key={acc._id}
                        style={[
                          styles.accountPill,
                          {
                            backgroundColor: isSelected
                              ? (theme.dark ? '#1B381E' : '#E8F5E9')
                              : (theme.dark ? '#2A2A2A' : '#F0F0F0'),
                            borderColor: isSelected ? theme.colors.primary : 'transparent',
                          },
                        ]}
                        onPress={() => setPaymentAccountId(acc._id)}
                      >
                        <Icon name={acc.icon || 'bank'} size={16} color={isSelected ? theme.colors.primary : '#888'} />
                        <Text style={[styles.pillText, { color: isSelected ? theme.colors.primary : (theme.dark ? '#FFF' : '#333') }]}>
                          {acc.name} ({acc.balance} ETB)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.colors.primary, marginTop: 14 }]}
              onPress={handleConfirmPay}
              disabled={paying}
            >
              {paying ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{t('confirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  filterRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryText: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  payButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  textInput: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  recurrenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  payPromptWrap: {
    marginBottom: 12,
  },
  payPromptText: {
    fontSize: 13,
    marginBottom: 8,
  },
  payAmountHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
    gap: 6,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PlannedExpensesScreen;
