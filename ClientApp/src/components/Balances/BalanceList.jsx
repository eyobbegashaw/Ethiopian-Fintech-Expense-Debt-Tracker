import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Avatar, Card, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../translations';

const BalanceList = ({ balances, members, onSettlePress, currentUserId }) => {
  const theme = useTheme();

  const renderBalanceItem = ({ item }) => {
    const isCurrentUser = item.userId === currentUserId;
    const isOwed = item.balance > 0;
    const isOwes = item.balance < 0;
    const absoluteBalance = Math.abs(item.balance);

    const getBalanceColor = () => {
      if (isOwed) return theme.colors.success || '#4CAF50';
      if (isOwes) return theme.colors.error || '#F44336';
      return theme.colors.disabled || '#999';
    };

    const getBalanceIcon = () => {
      if (isOwed) return 'arrow-up-bold';
      if (isOwes) return 'arrow-down-bold';
      return 'minus';
    };

    const getBalanceText = () => {
      if (isOwed) return `${i18n.t('you_are_owed')} ${absoluteBalance} ETB`;
      if (isOwes) return `${i18n.t('you_owe')} ${absoluteBalance} ETB`;
      return i18n.t('settled_up');
    };

    return (
      <Card style={styles.balanceCard}>
        <Card.Content style={styles.balanceContent}>
          <View style={styles.userInfo}>
            <Avatar.Text
              size={50}
              label={item.name.charAt(0)}
              style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
            />
            <View style={styles.userDetails}>
              <Text style={styles.userName}>{item.name}</Text>
              {item.nickname && (
                <Text style={styles.userNickname}>@{item.nickname}</Text>
              )}
            </View>
          </View>

          <View style={styles.balanceInfo}>
            <View
              style={[
                styles.balanceBadge,
                { backgroundColor: getBalanceColor() + '15' },
              ]}
            >
              <Icon
                name={getBalanceIcon()}
                size={16}
                color={getBalanceColor()}
              />
              <Text style={[styles.balanceText, { color: getBalanceColor() }]}>
                {getBalanceText()}
              </Text>
            </View>

            {!isCurrentUser && absoluteBalance > 0 && (
              <TouchableOpacity
                style={[
                  styles.settleButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => onSettlePress(item)}
              >
                <Text style={styles.settleButtonText}>
                  {i18n.t('settle_up')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const balanceData = members.map(member => ({
    userId: member.userId._id,
    name: member.nickname || member.userId.name,
    nickname: member.nickname,
    balance: balances[member.userId._id] || 0,
    phone: member.userId.phone,
  }));

  const sortedBalances = balanceData.sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedBalances}
        keyExtractor={item => item.userId}
        renderItem={renderBalanceItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  balanceCard: {
    marginBottom: 12,
    elevation: 2,
    borderRadius: 12,
  },
  balanceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userNickname: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  balanceInfo: {
    alignItems: 'flex-end',
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  settleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  settleButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default BalanceList;