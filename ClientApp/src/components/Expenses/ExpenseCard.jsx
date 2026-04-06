import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Card, Avatar, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import moment from 'moment';
import i18n from '../../translations';

const ExpenseCard = ({ expense, onPress, currentUserId }) => {
  const theme = useTheme();

  const getUserShare = () => {
    const userSplit = expense.splits.find(
      split => split.userId._id === currentUserId
    );
    return userSplit?.share || 0;
  };

  const isPayer = expense.paidBy._id === currentUserId;
  const userShare = getUserShare();
  const isSettled = userShare === 0;

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

  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.categoryIcon}>
              <Icon
                name={getCategoryIcon(expense.category)}
                size={24}
                color={theme.colors.primary}
              />
            </View>
            <View style={styles.expenseInfo}>
              <Text style={styles.description}>{expense.description}</Text>
              <Text style={styles.payer}>
                {i18n.t('paid_by')}: {expense.paidBy.name}
              </Text>
            </View>
            <Text style={styles.amount}>{expense.amount} ETB</Text>
          </View>

          <View style={styles.footer}>
            <View style={styles.splitInfo}>
              <Icon name="account-multiple" size={14} color="#999" />
              <Text style={styles.splitText}>
                {expense.splits.length} {i18n.t('people')}
              </Text>
            </View>

            {!isPayer && userShare > 0 && (
              <View
                style={[
                  styles.userShareBadge,
                  {
                    backgroundColor: isSettled ? '#4CAF50' : '#FF9800',
                  },
                ]}
              >
                <Text style={styles.userShareText}>
                  {isSettled
                    ? i18n.t('settled')
                    : `${i18n.t('you_owe')} ${userShare} ETB`}
                </Text>
              </View>
            )}

            {isPayer && (
              <View style={styles.payerBadge}>
                <Text style={styles.payerBadgeText}>{i18n.t('you_paid')}</Text>
              </View>
            )}

            <Text style={styles.date}>
              {moment(expense.date).format('MMM DD')}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  categoryIcon: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {
    flex: 1,
    marginLeft: 8,
  },
  description: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  payer: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  splitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  userShareBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  userShareText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  payerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  payerBadgeText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },
  date: {
    fontSize: 11,
    color: '#999',
  },
});

export default ExpenseCard;