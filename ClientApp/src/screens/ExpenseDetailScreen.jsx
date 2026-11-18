import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Share,
  Linking,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  Card,
  Button,
  Avatar,
  useTheme,
  ActivityIndicator,
  Divider,
  Chip,
  IconButton,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import i18n from '../translations';
import { expenseService } from '../services/expenseService';
import { settlementService } from '../services/settlementService';
import { useAuth } from '../contexts/AuthContext';
import { activatePaymentMethod, dialUssd } from '../utils/paymentLauncher';
import { useAppDate } from '../utils/dateUtils';

const ExpenseDetailScreen = ({ route, navigation }) => {
  const { expenseId, expense: initialExpense } = route?.params || {};
  const theme = useTheme();
  const { user } = useAuth();
  const { formatDate, formatDateTime, formatRelative } = useAppDate();
  const [expense, setExpense] = useState(initialExpense || null);
  const [loading, setLoading] = useState(!initialExpense);
  const [settling, setSettling] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [settleDialogVisible, setSettleDialogVisible] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState(null);
  const [paymentOptions, setPaymentOptions] = useState(null);

  const targetId = expenseId || initialExpense?._id;

  const loadExpense = async (id = targetId) => {
    if (!id) return;
    try {
      const response = await expenseService.getExpenseById(id);
      if (response.data) {
        setExpense(response.data);
      }
    } catch (error) {
      console.warn('Load expense error:', error);
      if (!expense) {
        Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (targetId) {
        loadExpense(targetId);
      }
    }, [targetId])
  );

  const handleSettleShare = async (split) => {
    setSelectedSplit(split);
    try {
      const options = await settlementService.getPaymentOptions(expense.groupId, split.userId._id);
      setPaymentOptions(options.data);
      setSettleDialogVisible(true);
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    }
  };

  const recordSettlement = async (method) => {
    try {
      setSettling(true);
      const settlementData = {
        groupId: expense.groupId,
        fromUser: selectedSplit.userId._id,
        toUser: expense.paidBy._id,
        amount: selectedSplit.share,
        method: method.method,
        transactionReference: method.reference || `TXN_${Date.now()}`,
        notes: `Settling share for ${expense.description}`,
        relatedExpenses: [expense._id],
      };
      
      await settlementService.createSettlement(settlementData);
      Alert.alert(i18n.t('success'), i18n.t('settlement_created_success'));
      setSettleDialogVisible(false);
      loadExpense(); // Reload to update status
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    } finally {
      setSettling(false);
    }
  };

  const handlePaymentMethod = async (method) => {
    // Open Telebirr or CBE Mobile Banking app or fallback to USSD
    await activatePaymentMethod(method, () => recordSettlement(method));
  };

  const handleShare = async () => {
    try {
      const userShare = getUserShare();
      const message = `${expense.description}: ${expense.amount} ETB\n` +
        `${i18n.t('paid_by')}: ${expense.paidBy.name}\n` +
        `${i18n.t('your_share')}: ${userShare.toFixed(2)} ETB\n` +
        `${i18n.t('date')}: ${formatDate(expense.date)}\n\n` +
        `${i18n.t('shared_via')} ${i18n.t('app_name')}`;
      
      await Share.share({
        message: message,
        title: expense.description,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await expenseService.deleteExpense(expenseId);
      Alert.alert(i18n.t('success'), i18n.t('expense_deleted_success'));
      navigation.goBack();
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    }
  };

  const handleEdit = () => {
    navigation.navigate('EditExpense', {
      expenseId: expense?._id || expense?.id,
      expense,
      groupId:
        expense?.groupId?._id ||
        expense?.groupId?.id ||
        expense?.groupId ||
        expense?.group_id,
    });
  };

  const getUserShare = () => {
    const currentUserId = user?._id || user?.id;
    const userSplit = expense?.splits?.find((split) => {
      const splitUid = split.userId?._id || split.userId?.id || split.userId;
      return String(splitUid) === String(currentUserId);
    });
    return userSplit?.share || userSplit?.amount || 0;
  };

  const isCurrentUserPayer = () => {
    const currentUserId = user?._id || user?.id;
    const payerId = expense?.paidBy?._id || expense?.paidBy?.id || expense?.paidBy;
    return Boolean(currentUserId && payerId && String(payerId) === String(currentUserId));
  };

  const getCategoryIcon = (category) => {
    const icons = {
      'Food & Drink': 'food',
      Transport: 'car',
      Rent: 'home',
      Utilities: 'flash',
      Shopping: 'cart',
      Entertainment: 'movie',
      'Coffee Ceremony': 'coffee',
      Gift: 'gift',
      Other: 'receipt',
    };
    return icons[category] || 'receipt';
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Food & Drink': '#FF9800',
      Transport: '#2196F3',
      Rent: '#9C27B0',
      Utilities: '#00BCD4',
      Shopping: '#E91E63',
      Entertainment: '#673AB7',
      'Coffee Ceremony': '#795548',
      Gift: '#F44336',
      Other: '#607D8B',
    };
    return colors[category] || '#666';
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
        <Button mode="contained" onPress={() => navigation.goBack()} style={styles.errorButton}>
          {i18n.t('go_back')}
        </Button>
      </View>
    );
  }

  const userShare = getUserShare();
  const isPayer = isCurrentUserPayer();
  const isSettled = userShare === 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header Card */}
      <Card style={[styles.headerCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.headerContent}>
            <View style={[styles.categoryIconContainer, { backgroundColor: getCategoryColor(expense.category) + '15' }]}>
              <Icon name={getCategoryIcon(expense.category)} size={40} color={getCategoryColor(expense.category)} />
            </View>
            <Text style={[styles.description, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>{expense.description}</Text>
            <Text style={styles.amount}>{expense.amount.toLocaleString()} ETB</Text>
            <Chip icon={getCategoryIcon(expense.category)} style={[styles.categoryChip, { backgroundColor: theme.dark ? '#2A2A2A' : '#f0f0f0' }]}>
              {i18n.t(expense.category.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_'))}
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Payer Info */}
      <Card style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>{i18n.t('paid_by')}</Text>
          <View style={styles.payerInfo}>
            {expense.paidBy?._id === user?._id && user?.avatar ? (
              <Avatar.Image
                size={56}
                source={{ uri: user.avatar }}
                style={styles.avatar}
              />
            ) : expense.paidBy?.avatar ? (
              <Avatar.Image
                size={56}
                source={{ uri: expense.paidBy.avatar }}
                style={styles.avatar}
              />
            ) : (
              <Avatar.Text
                size={56}
                label={expense.paidBy?.name?.charAt(0) || '?'}
                style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
              />
            )}
            <View style={styles.payerDetails}>
              <Text style={[styles.payerName, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>{expense.paidBy.name}</Text>
              <Text style={[styles.payerAmount, { color: theme.dark ? '#AAAAAA' : '#666666' }]}>
                {i18n.t('paid_total')}: {expense.amount.toLocaleString()} ETB
              </Text>
              {expense.paidBy.phone && (
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={() => Linking.openURL(`tel:${expense.paidBy.phone}`)}
                >
                  <Icon name="phone" size={14} color={theme.colors.primary} />
                  <Text style={styles.callText}>{i18n.t('call')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Split Details */}
      <Card style={[styles.infoCard, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>{i18n.t('split_details')}</Text>
          {expense.splits.map((split, index) => {
            const isUser = split.userId._id === user._id;
            const isPaid = split.isPaid;
            const percentage = (split.share / expense.amount * 100).toFixed(1);
            
            return (
              <View key={index} style={styles.splitItem}>
                <View style={styles.splitUserInfo}>
                  {isUser && user?.avatar ? (
                    <Avatar.Image
                      size={44}
                      source={{ uri: user.avatar }}
                      style={styles.splitAvatar}
                    />
                  ) : split.userId?.avatar ? (
                    <Avatar.Image
                      size={44}
                      source={{ uri: split.userId.avatar }}
                      style={styles.splitAvatar}
                    />
                  ) : (
                    <Avatar.Text
                      size={44}
                      label={split.userId?.name?.charAt(0) || '?'}
                      style={[styles.splitAvatar, { backgroundColor: isUser ? theme.colors.primary : '#9E9E9E' }]}
                    />
                  )}
                  <View style={styles.splitDetails}>
                    <Text style={styles.splitUserName}>
                      {split.userId.name}
                      {isUser && ` (${i18n.t('you')})`}
                    </Text>
                    <Text style={styles.splitShare}>
                      {split.share.toLocaleString()} ETB ({percentage}%)
                    </Text>
                  </View>
                </View>
                
                {isUser && !isPayer && !isPaid && userShare > 0 && (
                  <Button
                    mode="contained"
                    onPress={() => handleSettleShare(split)}
                    loading={settling && selectedSplit?.userId._id === split.userId._id}
                    disabled={settling}
                    style={styles.settleButton}
                    compact
                    icon="cash"
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
              {formatDateTime(expense.date)}
            </Text>
          </View>
          
          {expense.notes && (
            <View style={styles.infoRow}>
              <Icon name="note-text" size={20} color="#666" />
              <Text style={styles.infoText}>{expense.notes}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Icon name="clock-outline" size={20} color="#666" />
            <Text style={styles.infoText}>
              {i18n.t('added_by')} {expense.createdBy?.name || expense.paidBy.name} • {formatRelative(expense.createdAt)}
            </Text>
          </View>
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
        
        {(isPayer || String(expense?.createdBy?._id || expense?.createdBy?.id || expense?.createdBy || '') === String(user?._id || user?.id || '') || !expense?.createdBy) && (
          <Button
            mode="outlined"
            onPress={handleEdit}
            icon="pencil"
            style={styles.actionButton}
          >
            {i18n.t('edit')}
          </Button>
        )}
        
        {(isPayer || String(expense?.createdBy?._id || expense?.createdBy?.id || expense?.createdBy || '') === String(user?._id || user?.id || '') || !expense?.createdBy) && (
          <Button
            mode="outlined"
            onPress={() => setDeleteDialogVisible(true)}
            icon="delete"
            style={[styles.actionButton, styles.deleteButton]}
            textColor="#F44336"
          >
            {i18n.t('delete')}
          </Button>
        )}
      </View>

      {/* Delete Dialog */}
      <Modal
        visible={deleteDialogVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteDialogVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>{i18n.t('delete_expense')}</Text>
            <Text style={styles.dialogMessage}>{i18n.t('confirm_delete_expense')}</Text>
            <View style={styles.dialogActions}>
              <Button onPress={() => setDeleteDialogVisible(false)}>{i18n.t('cancel')}</Button>
              <Button onPress={handleDelete} textColor="#F44336">{i18n.t('delete')}</Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settlement Dialog */}
      <Modal
        visible={settleDialogVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSettleDialogVisible(false)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>{i18n.t('settle_up')}</Text>
            <Text style={styles.settleAmount}>
              {i18n.t('amount')}: {selectedSplit?.share?.toLocaleString()} ETB
            </Text>
            <Text style={styles.settleTo}>
              {i18n.t('pay_to')}: {expense?.paidBy?.name}
            </Text>
            <Divider style={styles.divider} />
            <Text style={styles.paymentMethodsTitle}>{i18n.t('select_payment_method')}</Text>
            {paymentOptions?.paymentOptions?.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.paymentOption}
                onPress={() => handlePaymentMethod(option)}
              >
                <Icon name={getMethodIcon(option.method)} size={24} color="#2E7D32" />
                <View style={styles.paymentOptionInfo}>
                  <Text style={styles.paymentOptionName}>{option.method}</Text>
                  {option.ussdCode && (
                    <TouchableOpacity onPress={() => dialUssd(option.ussdCode)}>
                      <Text style={styles.paymentOptionCode}>📞 {option.ussdCode} (Tap to dial)</Text>
                    </TouchableOpacity>
                  )}
                  {option.instructions && (
                    <Text style={styles.paymentOptionInstructions}>{option.instructions}</Text>
                  )}
                </View>
                <Icon name="chevron-right" size={20} color="#999" />
              </TouchableOpacity>
            ))}
            <View style={styles.dialogActions}>
              <Button onPress={() => setSettleDialogVisible(false)}>{i18n.t('cancel')}</Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const getMethodIcon = (method) => {
  switch (method) {
    case 'TeleBirr': return 'cellphone-wireless';
    case 'CBE Birr': return 'bank';
    case 'Amole': return 'wallet';
    case 'Cash': return 'cash';
    default: return 'credit-card';
  }
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
  errorButton: {
    marginTop: 20,
  },
  headerCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    elevation: 3,
  },
  headerContent: {
    alignItems: 'center',
  },
  categoryIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: '#f0f0f0',
  },
  infoCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
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
    marginRight: 16,
  },
  payerDetails: {
    flex: 1,
  },
  payerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  payerAmount: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  callText: {
    fontSize: 12,
    color: '#2E7D32',
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
    marginRight: 12,
  },
  splitDetails: {
    flex: 1,
  },
  splitUserName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  splitShare: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  settleButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 20,
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
    borderRadius: 8,
  },
  deleteButton: {
    borderColor: '#F44336',
  },
  divider: {
    marginVertical: 16,
  },
  settleAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
    marginBottom: 8,
  },
  settleTo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  paymentMethodsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 8,
  },
  paymentOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  paymentOptionCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  paymentOptionInstructions: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
});

export default ExpenseDetailScreen;
