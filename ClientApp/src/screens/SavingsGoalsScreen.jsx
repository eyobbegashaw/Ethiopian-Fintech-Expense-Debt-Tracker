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
import { savingsGoalService } from '../services/savingsGoalService';
import { accountService } from '../services/accountService';

const SAVINGS_CATEGORIES = [
  'Emergency Fund',
  'Home & Property',
  'Vehicle',
  'Education',
  'Holiday / Travel',
  'Business Investment',
  'Wedding / Ceremony',
  'General Savings',
];

const SavingsGoalsScreen = ({ navigation }) => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();

  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [totalTarget, setTotalTarget] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create Goal Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [category, setCategory] = useState('Emergency Fund');
  const [submitting, setSubmitting] = useState(false);

  // Deposit/Withdraw Modal
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState('deposit'); // 'deposit' | 'withdraw'
  const [activeGoal, setActiveGoal] = useState(null);
  const [actionAmount, setActionAmount] = useState('');
  const [actionAccountId, setActionAccountId] = useState('');
  const [actionNote, setActionNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      const [savingsRes, accountsRes] = await Promise.all([
        savingsGoalService.getSavingsGoals(),
        accountService.getAccounts().catch(() => ({ data: [] })),
      ]);

      if (savingsRes?.data) {
        setGoals(savingsRes.data);
        setTotalSaved(savingsRes.totalSaved || 0);
        setTotalTarget(savingsRes.totalTarget || 0);
        setOverallProgress(savingsRes.overallProgress || 0);
      }
      if (accountsRes?.data) {
        setAccounts(accountsRes.data);
      }
    } catch (error) {
      console.error('Error fetching savings goals:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateGoal = async () => {
    if (!title.trim() || !targetAmount || isNaN(targetAmount) || Number(targetAmount) <= 0) {
      Alert.alert(t('error'), 'Please enter a valid title and target amount');
      return;
    }

    setSubmitting(true);
    try {
      await savingsGoalService.createSavingsGoal({
        title: title.trim(),
        targetAmount: Number(targetAmount),
        currentAmount: initialAmount ? Number(initialAmount) : 0,
        category,
      });

      setTitle('');
      setTargetAmount('');
      setInitialAmount('');
      setCreateModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert(t('error'), error.response?.data?.message || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAction = (goal, type) => {
    setActiveGoal(goal);
    setActionType(type);
    setActionAmount('');
    setActionNote('');
    setActionAccountId(accounts[0]?._id || '');
    setActionModalVisible(true);
  };

  const handleConfirmAction = async () => {
    if (!actionAmount || isNaN(actionAmount) || Number(actionAmount) <= 0) {
      Alert.alert(t('error'), 'Please enter a valid amount');
      return;
    }

    setActionLoading(true);
    try {
      if (actionType === 'deposit') {
        await savingsGoalService.depositToGoal(activeGoal._id, {
          amount: Number(actionAmount),
          note: actionNote.trim(),
          sourceAccountId: actionAccountId || null,
        });
      } else {
        await savingsGoalService.withdrawFromGoal(activeGoal._id, {
          amount: Number(actionAmount),
          note: actionNote.trim(),
          destAccountId: actionAccountId || null,
        });
      }

      setActionModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert(t('error'), error.response?.data?.message || 'Transaction failed');
    } finally {
      setActionLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={[styles.headerHeroCard, { backgroundColor: '#4A148C' }]}>
      <Text style={styles.heroSub}>{t('savings_goals')}</Text>
      <Text style={styles.heroAmount}>
        {totalSaved.toLocaleString()} ETB
      </Text>
      <Text style={styles.heroTarget}>
        {isAmharic ? 'የታለመው አጠቃላይ መጠን' : 'Total Target'}: {totalTarget.toLocaleString()} ETB ({overallProgress}%)
      </Text>

      <View style={styles.heroProgressTrack}>
        <View style={[styles.heroProgressFill, { width: `${overallProgress}%` }]} />
      </View>
    </View>
  );

  const renderGoalItem = ({ item }) => (
    <View style={[styles.goalCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.goalTitleWrap}>
          <View style={[styles.iconCircle, { backgroundColor: '#EDE7F6' }]}>
            <Icon name="piggy-bank" size={22} color="#6A1B9A" />
          </View>
          <View>
            <Text style={[styles.goalTitle, { color: theme.dark ? '#FFF' : '#222' }]}>{item.title}</Text>
            <Text style={[styles.goalCategory, { color: theme.dark ? '#AAA' : '#777' }]}>{item.category}</Text>
          </View>
        </View>

        <Text style={[styles.percentageText, { color: '#6A1B9A' }]}>
          {item.percentage}%
        </Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: theme.dark ? '#333' : '#E0E0E0' }]}>
        <View style={[styles.progressFill, { width: `${item.percentage}%`, backgroundColor: '#6A1B9A' }]} />
      </View>

      <View style={styles.goalStatsRow}>
        <Text style={[styles.statItem, { color: theme.dark ? '#DDD' : '#444' }]}>
          {t('saved_amount')}: <Text style={{ fontWeight: 'bold' }}>{item.currentAmount.toLocaleString()} ETB</Text>
        </Text>
        <Text style={[styles.statItem, { color: theme.dark ? '#DDD' : '#444' }]}>
          {t('target_amount')}: <Text style={{ fontWeight: 'bold' }}>{item.targetAmount.toLocaleString()} ETB</Text>
        </Text>
      </View>

      <View style={styles.actionButtonsRow}>
        <TouchableOpacity
          style={[styles.actionChip, { backgroundColor: '#2E7D32' }]}
          onPress={() => handleOpenAction(item, 'deposit')}
        >
          <Icon name="plus" size={16} color="#FFF" />
          <Text style={styles.actionChipText}>{t('deposit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionChip, { backgroundColor: '#C2185B' }]}
          onPress={() => handleOpenAction(item, 'withdraw')}
        >
          <Icon name="minus" size={16} color="#FFF" />
          <Text style={styles.actionChipText}>{t('withdraw')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={goals}
        keyExtractor={(item) => item._id}
        renderItem={renderGoalItem}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="piggy-bank-outline" size={64} color="#999" />
            <Text style={[styles.emptyText, { color: theme.dark ? '#AAA' : '#888' }]}>
              {isAmharic ? 'ምንም የቁጠባ ግብ አልተፈጠረም' : 'No savings goals set yet'}
            </Text>
          </View>
        }
      />

      <FAB
        style={[styles.fab, { backgroundColor: '#6A1B9A' }]}
        icon="plus"
        onPress={() => setCreateModalVisible(true)}
      />

      {/* Create Goal Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent onRequestClose={() => setCreateModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFF' : '#222' }]}>
                {t('add_savings_goal')}
              </Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#AAA' : '#666'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                {isAmharic ? 'የግብ ርዕስ' : 'Goal Title'} *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                    color: theme.dark ? '#FFF' : '#000',
                  },
                ]}
                placeholder={isAmharic ? 'ለምሳሌ፡ የድንገተኛ አደጋ ቁጠባ' : 'e.g. Emergency Fund, New Car'}
                placeholderTextColor="#999"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                {t('target_amount')} (ETB) *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                    color: theme.dark ? '#FFF' : '#000',
                  },
                ]}
                placeholder="50,000"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={targetAmount}
                onChangeText={setTargetAmount}
              />

              <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                {isAmharic ? 'የመጀመሪያ የተቆጠበ መጠን (አማራጭ)' : 'Starting Amount (Optional)'}
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
                value={initialAmount}
                onChangeText={setInitialAmount}
              />

              <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                {isAmharic ? 'ምድብ' : 'Category'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {SAVINGS_CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? '#EDE7F6'
                            : (theme.dark ? '#2A2A2A' : '#F0F0F0'),
                          borderColor: isSelected ? '#6A1B9A' : 'transparent',
                        },
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[styles.chipText, { color: isSelected ? '#6A1B9A' : (theme.dark ? '#DDD' : '#333') }]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#6A1B9A' }]}
              onPress={handleCreateGoal}
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

      {/* Deposit / Withdraw Modal */}
      <Modal visible={actionModalVisible} animationType="slide" transparent onRequestClose={() => setActionModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFF' : '#222' }]}>
                {actionType === 'deposit' ? t('deposit') : t('withdraw')}
              </Text>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#AAA' : '#666'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
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
                value={actionAmount}
                onChangeText={setActionAmount}
              />

              <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                {actionType === 'deposit' ? t('source_account') : t('destination_account')} (አማራጭ)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {accounts.map((acc) => {
                  const isSelected = actionAccountId === acc._id;
                  return (
                    <TouchableOpacity
                      key={acc._id}
                      style={[
                        styles.accountPill,
                        {
                          backgroundColor: isSelected
                            ? '#EDE7F6'
                            : (theme.dark ? '#2A2A2A' : '#F0F0F0'),
                          borderColor: isSelected ? '#6A1B9A' : 'transparent',
                        },
                      ]}
                      onPress={() => setActionAccountId(acc._id)}
                    >
                      <Icon name={acc.icon || 'bank'} size={16} color={isSelected ? '#6A1B9A' : '#888'} />
                      <Text style={[styles.pillText, { color: isSelected ? '#6A1B9A' : (theme.dark ? '#FFF' : '#333') }]}>
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: actionType === 'deposit' ? '#2E7D32' : '#C2185B' }]}
              onPress={handleConfirmAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
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
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  headerHeroCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  heroSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  heroAmount: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  heroTarget: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginBottom: 10,
  },
  heroProgressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  heroProgressFill: {
    height: '100%',
    backgroundColor: '#81C784',
    borderRadius: 4,
  },
  goalCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  goalCategory: {
    fontSize: 11,
    marginTop: 2,
  },
  percentageText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    fontSize: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  actionChipText: {
    color: '#FFF',
    fontSize: 12,
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
  horizontalScroll: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
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

export default SavingsGoalsScreen;
