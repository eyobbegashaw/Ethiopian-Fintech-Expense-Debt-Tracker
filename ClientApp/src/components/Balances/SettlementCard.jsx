
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

const SettlementCard = ({ settlement, onPress }) => {
  const theme = useTheme();

  const getMethodIcon = (method) => {
    switch (method) {
      case 'TeleBirr':
        return 'cellphone-wireless';
      case 'CBE Birr':
        return 'bank';
      case 'Amole':
        return 'wallet';
      case 'Cash':
        return 'cash';
      default:
        return 'credit-card';
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'TeleBirr':
        return '#2196F3';
      case 'CBE Birr':
        return '#4CAF50';
      case 'Amole':
        return '#FF9800';
      case 'Cash':
        return '#9C27B0';
      default:
        return '#666';
    }
  };

  return (
    <TouchableOpacity onPress={() => onPress?.(settlement)}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.users}>
              <View style={styles.user}>
                <Avatar.Text
                  size={32}
                  label={settlement.fromUser?.name?.charAt(0) || '?'}
                  style={styles.smallAvatar}
                />
                <Text style={styles.userName}>{settlement.fromUser?.name}</Text>
              </View>
              <Icon name="arrow-right" size={20} color="#999" />
              <View style={styles.user}>
                <Avatar.Text
                  size={32}
                  label={settlement.toUser?.name?.charAt(0) || '?'}
                  style={styles.smallAvatar}
                />
                <Text style={styles.userName}>{settlement.toUser?.name}</Text>
              </View>
            </View>
            <Text style={styles.amount}>
              {settlement.amount} {settlement.currency || 'ETB'}
            </Text>
          </View>

          <View style={styles.footer}>
            <View
              style={[
                styles.methodBadge,
                { backgroundColor: getMethodColor(settlement.method) + '15' },
              ]}
            >
              <Icon
                name={getMethodIcon(settlement.method)}
                size={14}
                color={getMethodColor(settlement.method)}
              />
              <Text
                style={[
                  styles.methodText,
                  { color: getMethodColor(settlement.method) },
                ]}
              >
                {settlement.method}
              </Text>
            </View>

            {settlement.transactionReference && (
              <Text style={styles.reference}>
                Ref: {settlement.transactionReference}
              </Text>
            )}

            <Text style={styles.date}>
              {moment(settlement.date).format('MMM DD, YYYY')}
            </Text>
          </View>

          {settlement.notes && (
            <Text style={styles.notes}>{settlement.notes}</Text>
          )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  users: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  user: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  smallAvatar: {
    backgroundColor: '#2E7D32',
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  methodText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reference: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
  },
  date: {
    fontSize: 11,
    color: '#999',
  },
  notes: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default SettlementCard;