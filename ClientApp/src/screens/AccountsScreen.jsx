import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTheme, ActivityIndicator, FAB } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { accountService } from '../services/accountService';

import AddAccountModal from '../components/Finance/AddAccountModal';
import TransferModal from '../components/Finance/TransferModal';

const AccountsScreen = ({ navigation }) => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();

  const [accounts, setAccounts] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [addAccountVisible, setAddAccountVisible] = useState(false);
  const [transferVisible, setTransferVisible] = useState(false);

  const loadAccounts = async () => {
    try {
      const response = await accountService.getAccounts();
      if (response?.data) {
        setAccounts(response.data);
        setTotalBalance(response.totalBalance || 0);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAccounts();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAccounts();
    setRefreshing(false);
  };

  const handleDeleteAccount = (account) => {
    Alert.alert(
      t('delete'),
      isAmharic
        ? `"${account.name}" ሒሳብን ማስወገድ ይፈልጋሉ?`
        : `Are you sure you want to delete/archive "${account.name}"?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await accountService.deleteAccount(account._id);
              loadAccounts();
            } catch (err) {
              Alert.alert(t('error'), 'Could not delete account');
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Total Balance Card */}
      <View style={[styles.totalCard, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.totalLabel, { color: theme.dark ? '#AAA' : '#666' }]}>
          {t('total_balance')} ({t('net_worth')})
        </Text>
        <Text style={[styles.totalAmount, { color: theme.colors.primary }]}>
          {totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
        </Text>
        <Text style={[styles.disclaimerText, { color: theme.dark ? '#888' : '#999' }]}>
          {t('disclaimer_balance')}
        </Text>

        <View style={styles.headerButtonsRow}>
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => setAddAccountVisible(true)}
          >
            <Icon name="plus" size={18} color="#FFF" />
            <Text style={styles.headerBtnText}>{t('add_account')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: '#1976D2' }]}
            onPress={() => setTransferVisible(true)}
          >
            <Icon name="swap-horizontal" size={18} color="#FFF" />
            <Text style={styles.headerBtnText}>{t('transfer')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderAccountItem = ({ item }) => (
    <View style={[styles.accountCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.cardMain}>
        <View style={[styles.iconCircle, { backgroundColor: `${item.color || '#2E7D32'}20` }]}>
          <Icon name={item.icon || 'bank'} size={24} color={item.color || '#2E7D32'} />
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.nameRow}>
            <Text style={[styles.accountName, { color: theme.dark ? '#FFF' : '#222' }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isDefault && (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            )}
          </View>
          <Text style={[styles.accountSub, { color: theme.dark ? '#AAA' : '#777' }]}>
            {item.institution} {item.accountNumber ? `• ${item.accountNumber}` : ''}
          </Text>
        </View>

        <View style={styles.cardBalanceWrap}>
          <Text style={[styles.balanceAmount, { color: theme.dark ? '#81C784' : '#2E7D32' }]}>
            {item.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={[styles.currencyText, { color: theme.dark ? '#AAA' : '#777' }]}>
            {item.currency}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.cardActionBtn}
          onPress={() => setTransferVisible(true)}
        >
          <Icon name="swap-horizontal" size={16} color="#1976D2" />
          <Text style={[styles.cardActionText, { color: '#1976D2' }]}>{t('transfer')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cardActionBtn}
          onPress={() => handleDeleteAccount(item)}
        >
          <Icon name="delete-outline" size={16} color="#D32F2F" />
          <Text style={[styles.cardActionText, { color: '#D32F2F' }]}>{t('delete')}</Text>
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
        data={accounts}
        keyExtractor={(item) => item._id}
        renderItem={renderAccountItem}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="bank-outline" size={64} color="#999" />
            <Text style={[styles.emptyText, { color: theme.dark ? '#AAA' : '#888' }]}>
              {isAmharic ? 'ምንም የተመዘገበ ሒሳብ የለም። ሒሳብ ያክሉ።' : 'No accounts added yet. Add your CBE, TeleBirr, or Cash account.'}
            </Text>
          </View>
        }
      />

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => setAddAccountVisible(true)}
      />

      <AddAccountModal
        visible={addAccountVisible}
        onClose={() => setAddAccountVisible(false)}
        onSuccess={loadAccounts}
      />

      <TransferModal
        visible={transferVisible}
        onClose={() => setTransferVisible(false)}
        onSuccess={loadAccounts}
        accounts={accounts}
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
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  headerContainer: {
    marginBottom: 16,
  },
  totalCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  disclaimerText: {
    fontSize: 11,
    marginBottom: 16,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  headerBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  headerBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  accountCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  defaultBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultBadgeText: {
    color: '#2E7D32',
    fontSize: 9,
    fontWeight: 'bold',
  },
  accountSub: {
    fontSize: 12,
    marginTop: 2,
  },
  cardBalanceWrap: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  currencyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    gap: 16,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '600',
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
});

export default AccountsScreen;
