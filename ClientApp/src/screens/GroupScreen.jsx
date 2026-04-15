import React, { useState, useEffect, useCallback } from 'react';
import {
  View,   
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Card, Button, Chip, useTheme, ActivityIndicator, Avatar } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../translations';
import { groupService } from '../services/groupService';
import ExpenseCard from '../components/Expenses/ExpenseCard';
import BalanceList from '../components/Balances/BalanceList';
import SimplifyDebtsModal from '../components/Balances/SimplifyDebtsModal';
import { useAuth } from '../contexts/AuthContext';

const GroupScreen = ({ route, navigation }) => {
  const { groupId } = route.params;
  const theme = useTheme();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({});
  const [simplifiedDebts, setSimplifiedDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showSimplifyModal, setShowSimplifyModal] = useState(false);
  const [activeTab, setActiveTab] = useState('expenses');

  const loadGroupData = async () => {
    try {
      const response = await groupService.getGroup(groupId);
      setGroup(response.data.group);
      setExpenses(response.data.expenses);
      setBalances(response.data.balances);
      setSimplifiedDebts(response.data.simplifiedDebts);
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadGroupData();
    }, [groupId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroupData();
    setRefreshing(false);
  };

  const getUserBalance = () => {
    const balance = balances[user._id] || 0;
    return {
      amount: Math.abs(balance),
      type: balance > 0 ? 'owed' : balance < 0 ? 'owes' : 'settled',
      text: balance > 0 
        ? `${i18n.t('you_are_owed')} ${balance} ETB`
        : balance < 0 
          ? `${i18n.t('you_owe')} ${Math.abs(balance)} ETB`
          : i18n.t('settled_up'),
    };
  };

  const handleLeaveGroup = () => {
    Alert.alert(
      i18n.t('leave_group'),
      i18n.t('confirm_leave_group'),
      [
        { text: i18n.t('cancel'), style: 'cancel' },
        {
          text: i18n.t('leave'),
          style: 'destructive',
          onPress: async () => {
            try {
              await groupService.leaveGroup(groupId);
              navigation.goBack();
            } catch (error) {
              Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const userBalance = getUserBalance();

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Group Header */}
        <View style={styles.header}>
          <Text style={styles.groupIcon}>{group.icon || '👥'}</Text>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description && (
            <Text style={styles.groupDescription}>{group.description}</Text>
          )}
          <View style={styles.headerStats}>
            <Chip icon="account-group" style={styles.chip}>
              {group.members.length} {i18n.t('members')}
            </Chip>
            {group.category && group.category !== 'Other' && (
              <Chip icon="tag" style={styles.chip}>
                {i18n.t(group.category.toLowerCase().replace(/ /g, '_'))}
              </Chip>
            )}
          </View>
        </View>

        {/* Balance Card */}
        <Card style={styles.balanceCard}>
          <Card.Content>
            <View style={styles.balanceContent}>
              <Icon
                name={userBalance.type === 'owed' ? 'arrow-up-bold' : userBalance.type === 'owes' ? 'arrow-down-bold' : 'check'}
                size={32}
                color={
                  userBalance.type === 'owed' ? '#4CAF50' :
                  userBalance.type === 'owes' ? '#F44336' : '#999'
                }
              />
              <View style={styles.balanceTextContainer}>
                <Text style={styles.balanceAmount}>
                  {userBalance.amount > 0 ? `${userBalance.amount} ETB` : ''}
                </Text>
                <Text style={styles.balanceStatus}>{userBalance.text}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('AddExpense', { groupId })}
          >
            <Icon name="plus-circle" size={24} color="#fff" />
            <Text style={styles.actionText}>{i18n.t('add_expense')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
            onPress={() => setShowSimplifyModal(true)}
          >
            <Icon name="calculator" size={24} color="#fff" />
            <Text style={styles.actionText}>{i18n.t('simplify_debts')}</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'expenses' && styles.tabActive]}
            onPress={() => setActiveTab('expenses')}
          >
            <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>
              {i18n.t('expenses')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'members' && styles.tabActive]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
              {i18n.t('members')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'expenses' ? (
          <View style={styles.expensesContainer}>
            {expenses.length === 0 ? (
              <View style={styles.emptyExpenses}>
                <Icon name="receipt" size={48} color="#ccc" />
                <Text style={styles.emptyText}>{i18n.t('no_expenses')}</Text>
                <TouchableOpacity
                  style={styles.addExpenseButton}
                  onPress={() => navigation.navigate('AddExpense', { groupId })}
                >
                  <Text style={styles.addExpenseButtonText}>{i18n.t('add_first_expense')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              expenses.map(expense => (
                <ExpenseCard
                  key={expense._id}
                  expense={expense}
                  onPress={() => navigation.navigate('ExpenseDetail', { expenseId: expense._id, expense })}
                  currentUserId={user._id}
                />
              ))
            )}
          </View>
        ) : (
          <BalanceList
            balances={balances}
            members={group.members}
            onSettlePress={(member) => {
              // Navigate to settlement screen
              Alert.alert('Settle', `Settle with ${member.name}`);
            }}
            currentUserId={user._id}
          />
        )}
      </ScrollView>

      <SimplifyDebtsModal
        visible={showSimplifyModal}
        onClose={() => setShowSimplifyModal(false)}
        debts={simplifiedDebts}
        groupId={groupId}
        onSuccess={loadGroupData}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  groupIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  groupName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  groupDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  headerStats: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  chip: {
    backgroundColor: '#f0f0f0',
  },
  balanceCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  balanceContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  balanceTextContainer: {
    marginLeft: 12,
    alignItems: 'center',
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  balanceStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#2E7D32',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  expensesContainer: {
    padding: 16,
  },
  emptyExpenses: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
  },
  addExpenseButton: {
    marginTop: 16,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addExpenseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GroupScreen;
