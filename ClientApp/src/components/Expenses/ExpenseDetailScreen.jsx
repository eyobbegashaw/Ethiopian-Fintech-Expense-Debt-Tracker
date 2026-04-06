import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
  Linking,
} from 'react-native';
import {
  Card,
  Button,
  Avatar,
  useTheme,
  ActivityIndicator,
  Divider,
  Chip,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import moment from 'moment';
import i18n from '../../translations';
import { expenseService } from '../../services/expenseService';
import { settlementService } from '../../services/settlementService';

const ExpenseDetailScreen = ({ route, navigation }) => {
  const { expenseId } = route.params;
  const theme = useTheme();
  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    loadExpense();
  }, []);

  const loadExpense = async () => {
    try {
      // In production, you'd have a getExpenseById endpoint
      // For now, we'll use the data from navigation params or mock
      const expenseData = route.params.expense;
      if (expenseData) {
        setExpense(expenseData);
      }
      setLoading(false);
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
      setLoading(false);
    }
  };

  const handleSettleShare = async (userId) => {
    Alert.alert(
      i18n.t('confirm'),
      i18n.t('confirm_settle_share'),
      [
        { text: i18n.t('cancel'), style: 'cancel' },
        {
          text: i18n.t('confirm'),
          onPress: async () => {
            try {
              setSettling(true);
              const settlementData = {
                groupId: expense.groupId,
                fromUser: userId,
                toUser: expense.paidBy._id,
                amount: expense.splits.find(s => s.userId._id === userId).share,
                method: 'Cash',
                notes: `Settling share for ${expense.description}`,
              };
              await settlementService.createSettlement(settlementData);
              Alert.alert(i18n.t('success'), i18n.t('settlement_created_success'));
              loadExpense();
            } catch (error) {
              Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
            } finally {
              setSettling(false);
            }
          },
        },
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${expense.description}: ${expense.amount} ETB paid by ${expense.paidBy.name}\nYour share: ${getUserShare()} ETB\nView in Ethio Debt Tracker`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      i18n.t('delete_expense'),
      i18n.t('confirm_delete_expense'),
      [
        { text: i18n.t('cancel'), style: 'cancel' },
        {
          text: i18n.t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await expenseService.deleteExpense(expenseId);
              Alert.alert(i18n.t('success'), i18n.t('expense_deleted_success'));
              navigation.goBack();
            } catch (error) {
              Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
            }
          },
        },
      ]
    );
  };

  const getUserShare = () => {
    const userSplit = expense?.splits?.find(
      split => split.userId._id === route.params?.currentUserId
    );
    return userSplit?.share || 0;
  };

  const isCurrentUserPayer = () => {
    return expense?.paidBy._id === route.params?.currentUserId;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!expense) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={64} color="#F44336" />
        <Text style={styles.errorText}>{i18n.t('expense_not_found')}</Text>
      </View>
    );
  }

  const userShare = getUserShare();
  const isPayer = isCurrentUserPayer();
  const isSettled = userShare === 0;

  return (
    <ScrollView style={styles.container}>
      {/* Header Card */}
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.headerContent}>
            <View style={styles.categoryIcon}>
              <Icon name="receipt" size={40} color="#2E7D32" />
            </View>
            <Text style={styles.description}>{expense.description}</Text>
            <Text style={styles.amount}>{expense.amount} ETB</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Payer Info */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>{i18n.t('paid_by')}</Text>
          <View style={styles.payerInfo}>
            <Avatar.Text
              size={50}
              label={expense.paidBy.name?.charAt(0) || '?'}
              style={styles.avatar}
            />
            <View style={styles.payerDetails}>
              <Text style={styles.payerName}>{expense.paidBy.name}</Text>
              <Text style={styles.payerAmount}>
                {i18n.t('paid_total')}: {expense.amount} ETB
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Split Details */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>{i18n.t('split_details')}</Text>
          {expense.splits.map((split, index) => {
            const isUser = split.userId._id === route.params?.currentUserId;
            const isPaid = split.isPaid;
            
            return (
              <View key={index} style={styles.splitItem}>
                <View style={styles.splitUserInfo}>
                  <Avatar.Text
                    size={40}
                    label={split.userId.name?.charAt(0) || '?'}
                    style={styles.splitAvatar}
                  />
                  <View>
                    <Text style={styles.splitUserName}>
                      {split.userId.name}
                      {isUser && ` (${i18n.t('you')})`}
                    </Text>
                    <Text style={styles.splitShare}>
                      {i18n.t('owes')}: {split.share} ETB
                    </Text>
                  </View>
                </View>
                
                {isUser && !isPayer && !isPaid && userShare > 0 && (
                  <Button
                    mode="contained"
                    onPress={() => handleSettleShare(split.userId._id)}
                    loading={settling}
                    disabled={settling}
                    style={styles.settleButton}
                    compact
                  >
                    {i18n.t('settle_up')}
                  </Button>
                )}
                
                {isPaid && (
                  <Chip icon="check" style={styles.paidChip}>
                    {i18n.t('settled')}
                  </Chip>
                )}
              </View>
            );
          })}
        </Card.Content>
      </Card>

      {/* Additional Info */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>{i18n.t('additional_info')}</Text>
          
          <View style={styles.infoRow}>
            <Icon name="calendar" size={20} color="#666" />
            <Text style={styles.infoText}>
              {moment(expense.date).format('MMMM DD, YYYY')}
            </Text>
          </View>
          
          {expense.category && (
            <View style={styles.infoRow}>
              <Icon name="tag" size={20} color="#666" />
              <Text style={styles.infoText}>{i18n.t(expense.category.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_'))}</Text>
            </View>
          )}
          
          {expense.notes && (
            <View style={styles.infoRow}>
              <Icon name="note-text" size={20} color="#666" />
              <Text style={styles.infoText}>{expense.notes}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <Button
          mode="outlined"
          onPress={handleShare}
          icon="share-variant"
          style={styles.actionButton}
        >
          {i18n.t('share')}
        </Button>
        
        {isPayer && (
          <Button
            mode="outlined"
            onPress={handleDelete}
            icon="delete"
            style={[styles.actionButton, styles.deleteButton]}
            textColor="#F44336"
          >
            {i18n.t('delete')}
          </Button>
        )}
      </View>
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  headerContent: {
    alignItems: 'center',
  },
  categoryIcon: {
    marginBottom: 12,
  },
  description: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  infoCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  payerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#2E7D32',
    marginRight: 12,
  },
  payerDetails: {
    flex: 1,
  },
  payerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  payerAmount: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  splitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  splitUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  splitAvatar: {
    backgroundColor: '#9E9E9E',
    marginRight: 12,
  },
  splitUserName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  splitShare: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  settleButton: {
    backgroundColor: '#2E7D32',
  },
  paidChip: {
    backgroundColor: '#E8F5E9',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    marginBottom: 30,
  },
  actionButton: {
    flex: 1,
  },
  deleteButton: {
    borderColor: '#F44336',
  },
});

export default ExpenseDetailScreen;