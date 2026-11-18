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
import { budgetService } from '../services/budgetService';

const BUDGET_CATEGORIES = [
  'All Categories',
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Housing & Rent',
  'Utilities',
  'Health & Medical',
  'Entertainment',
  'Education',
  'Shopping',
  'Family & Personal',
  'Other Expense',
];

const BudgetScreen = ({ navigation }) => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();

  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add budget modal
  const [modalVisible, setModalVisible] = useState(false);
  const [budgetName, setBudgetName] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState('monthly');
  const [submitting, setSubmitting] = useState(false);

  const loadBudgets = async () => {
    try {
      const response = await budgetService.getBudgets();
      if (response?.data) {
        setBudgets(response.data);
      }
    } catch (error) {
      console.error('Error loading budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBudgets();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBudgets();
    setRefreshing(false);
  };

  const handleCreateBudget = async () => {
    if (!budgetName.trim()) {
      Alert.alert(t('error'), isAmharic ? 'እባክዎ የበጀት ስም ያስገቡ' : 'Please enter a budget name');
      return;
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      Alert.alert(t('error'), isAmharic ? 'እባክዎ ትክክለኛ የበጀት መጠን ያስገቡ' : 'Please enter a valid amount');
      return;
    }

    setSubmitting(true);
    try {
      await budgetService.createBudget({
        name: budgetName.trim(),
        category,
        amount: Number(amount),
        period,
      });

      setBudgetName('');
      setAmount('');
      setModalVisible(false);
      loadBudgets();
    } catch (error) {
      Alert.alert(t('error'), error.response?.data?.message || 'Failed to create budget');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = (budget) => {
    Alert.alert(
      t('delete'),
      isAmharic ? `"${budget.name}" በጀትን ማስወገድ ይፈልጋሉ?` : `Delete budget "${budget.name}"?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await budgetService.deleteBudget(budget._id);
              loadBudgets();
            } catch (err) {
              Alert.alert(t('error'), 'Could not delete budget');
            }
          },
        },
      ]
    );
  };

  const renderBudgetItem = ({ item }) => {
    const isExceeded = item.percentage >= 100;
    const isWarning = item.percentage >= 80 && !isExceeded;
    const barColor = isExceeded ? '#D32F2F' : isWarning ? '#F57C00' : '#2E7D32';

    return (
      <View style={[styles.budgetCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={[styles.budgetName, { color: theme.dark ? '#FFF' : '#222' }]}>
              {item.name}
            </Text>
            <Text style={[styles.categoryBadge, { color: theme.dark ? '#AAA' : '#777' }]}>
              {item.category} • {item.period.toUpperCase()}
            </Text>
          </View>

          <TouchableOpacity onPress={() => handleDeleteBudget(item)}>
            <Icon name="trash-can-outline" size={18} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressTrack, { backgroundColor: theme.dark ? '#333' : '#E0E0E0' }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(100, item.percentage)}%`,
                backgroundColor: barColor,
              },
            ]}
          />
        </View>

        {/* Status Numbers */}
        <View style={styles.numbersRow}>
          <View>
            <Text style={[styles.subLabel, { color: theme.dark ? '#AAA' : '#777' }]}>{t('spent')}</Text>
            <Text style={[styles.numberValue, { color: barColor }]}>
              {item.spent.toLocaleString()} ETB
            </Text>
          </View>

          <View style={styles.centerPercentWrap}>
            <Text style={[styles.percentText, { color: barColor }]}>
              {item.percentage}%
            </Text>
            {isExceeded && (
              <Text style={styles.warningTag}>{t('budget_exceeded')}</Text>
            )}
            {isWarning && (
              <Text style={[styles.warningTag, { color: '#F57C00' }]}>{t('budget_warning')}</Text>
            )}
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.subLabel, { color: theme.dark ? '#AAA' : '#777' }]}>{t('remaining')}</Text>
            <Text style={[styles.numberValue, { color: theme.dark ? '#FFF' : '#333' }]}>
              {item.remaining.toLocaleString()} ETB
            </Text>
          </View>
        </View>
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
      <FlatList
        data={budgets}
        keyExtractor={(item) => item._id}
        renderItem={renderBudgetItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="chart-bell-curve-cumulative" size={64} color="#999" />
            <Text style={[styles.emptyText, { color: theme.dark ? '#AAA' : '#888' }]}>
              {isAmharic ? 'ምንም በጀት አልተዘጋጀም። ወጪዎን ለመቆጣጠር በጀት ያዘጋጁ።' : 'No active budgets yet. Create a budget to stay on track.'}
            </Text>
          </View>
        }
      />

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => setModalVisible(true)}
      />

      {/* Add Budget Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFF' : '#222' }]}>
                {t('add_budget')}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#AAA' : '#666'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                {isAmharic ? 'የበጀት ስም' : 'Budget Name'} *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                    color: theme.dark ? '#FFF' : '#000',
                  },
                ]}
                placeholder={isAmharic ? 'ለምሳሌ፡ የወር የምግብ በጀት' : 'e.g. Monthly Dining Budget'}
                placeholderTextColor="#999"
                value={budgetName}
                onChangeText={setBudgetName}
              />

              <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                {t('budget_amount')} (ETB) *
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
                {isAmharic ? 'ምድብ' : 'Category'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {BUDGET_CATEGORIES.map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected
                            ? (theme.dark ? '#1B381E' : '#E8F5E9')
                            : (theme.dark ? '#2A2A2A' : '#F0F0F0'),
                          borderColor: isSelected ? theme.colors.primary : 'transparent',
                        },
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text style={[styles.chipText, { color: isSelected ? theme.colors.primary : (theme.dark ? '#FFF' : '#333') }]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCreateBudget}
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
  budgetCard: {
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
  budgetName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryBadge: {
    fontSize: 12,
    marginTop: 2,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  numbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  numberValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  centerPercentWrap: {
    alignItems: 'center',
  },
  percentText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningTag: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginTop: 2,
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

export default BudgetScreen;
