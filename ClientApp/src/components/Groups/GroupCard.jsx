
import React from 'react';
import {
  View,
  Text,    
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Card, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../translations';

const GroupCard = ({ group, onPress }) => {
  const theme = useTheme();

  const getBalanceColor = () => {
    if (group.userBalance > 0) return '#4CAF50';
    if (group.userBalance < 0) return '#F44336';
    return '#999';
  };

  const getBalanceIcon = () => {
    if (group.userBalance > 0) return 'arrow-up-bold';
    if (group.userBalance < 0) return 'arrow-down-bold';
    return 'minus';
  };

  const getBalanceText = () => {
    const absBalance = Math.abs(group.userBalance);
    if (group.userBalance > 0) {
      return `${i18n.t('you_are_owed')} ${absBalance} ETB`;
    }
    if (group.userBalance < 0) {
      return `${i18n.t('you_owe')} ${absBalance} ETB`;
    }
    return i18n.t('settled_up');
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{group.icon || '👥'}</Text>
            </View>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{group.name}</Text>
              <View style={styles.metaInfo}>
                <Icon name="account-group" size={14} color="#999" />
                <Text style={styles.memberCount}>
                  {group.memberCount} {group.memberCount === 1 ? i18n.t('member') : i18n.t('members')}
                </Text>
                {group.category && group.category !== 'Other' && (
                  <>
                    <View style={styles.dot} />
                    <Text style={styles.category}>{i18n.t(group.category.toLowerCase().replace(/ /g, '_'))}</Text>
                  </>
                )}
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <View
              style={[
                styles.balanceBadge,
                { backgroundColor: getBalanceColor() + '15' },
              ]}
            >
              <Icon name={getBalanceIcon()} size={16} color={getBalanceColor()} />
              <Text style={[styles.balanceText, { color: getBalanceColor() }]}>
                {getBalanceText()}
              </Text>
            </View>
            <Icon name="chevron-right" size={20} color="#ccc" />
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
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 28,
  },
  groupInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCount: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
    marginHorizontal: 6,
  },
  category: {
    fontSize: 12,
    color: '#999',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default GroupCard;
