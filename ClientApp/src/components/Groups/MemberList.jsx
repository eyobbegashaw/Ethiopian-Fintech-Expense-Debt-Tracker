import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Avatar, Button, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../translations';
import { useAuth } from '../../contexts/AuthContext';

const MemberList = ({ members, balances, currentUserId, isAdmin, onRemoveMember, onMakeAdmin }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [menuVisible, setMenuVisible] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

  const getBalanceForMember = (memberId) => {
    const balance = balances[memberId] || 0;
    return {
      amount: Math.abs(balance),
      type: balance > 0 ? 'owed' : balance < 0 ? 'owes' : 'settled',
      text: balance > 0 
        ? `${i18n.t('is_owed')} ${balance} ETB`
        : balance < 0 
          ? `${i18n.t('owes')} ${Math.abs(balance)} ETB`
          : i18n.t('settled'),
    };
  };

  const handleRemoveMember = (member) => {
    Alert.alert(
      i18n.t('remove_member'),
      i18n.t('confirm_remove_member', { name: member.userId.name }),
      [
        { text: i18n.t('cancel'), style: 'cancel' },
        {
          text: i18n.t('remove'),
          style: 'destructive',
          onPress: () => onRemoveMember?.(member.userId._id),
        },
      ]
    );
  };

  const handleMakeAdmin = (member) => {
    Alert.alert(
      i18n.t('make_admin'),
      i18n.t('confirm_make_admin', { name: member.userId.name }),
      [
        { text: i18n.t('cancel'), style: 'cancel' },
        {
          text: i18n.t('confirm'),
          onPress: () => onMakeAdmin?.(member.userId._id),
        },
      ]
    );
  };

  const renderMemberItem = ({ item }) => {
    const isCurrentUser = item.userId._id === currentUserId;
    const balance = getBalanceForMember(item.userId._id);
    const isMemberAdmin = item.role === 'admin';

    return (
      <View
        style={[
          styles.memberItem,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.dark ? '#3C3C3C' : '#e0e0e0',
            borderWidth: theme.dark ? 1 : 0,
          }
        ]}
      >
        <View style={styles.memberInfo}>
          {isCurrentUser && user?.avatar ? (
            <Avatar.Image
              size={50}
              source={{ uri: user.avatar }}
              style={styles.avatar}
            />
          ) : item.userId?.avatar ? (
            <Avatar.Image
              size={50}
              source={{ uri: item.userId.avatar }}
              style={styles.avatar}
            />
          ) : (
            <Avatar.Text
              size={50}
              label={item.userId.name?.charAt(0) || '?'}
              style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
            />
          )}
          <View style={styles.memberDetails}>
            <View style={styles.nameContainer}>
              <Text style={[styles.memberName, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>
                {item.nickname || item.userId.name}
              </Text>
              {isCurrentUser && (
                <View style={styles.youBadge}>
                  <Text style={styles.youText}>{i18n.t('you')}</Text>
                </View>
              )}
              {isMemberAdmin && (
                <Icon name="crown" size={16} color="#FFC107" />
              )}
            </View>
            {item.nickname && (
              <Text style={[styles.realName, { color: theme.dark ? '#AAAAAA' : '#666666' }]}>{item.userId.name}</Text>
            )}
            <Text style={[styles.memberPhone, { color: theme.dark ? '#888888' : '#999999' }]}>{item.userId.phone}</Text>
            <View
              style={[
                styles.balanceBadge,
                {
                  backgroundColor: 
                    balance.type === 'owed' ? '#4CAF50' :
                    balance.type === 'owes' ? '#FF9800' : '#E8F5E9',
                },
              ]}
            >
              <Text
                style={[
                  styles.balanceText,
                  {
                    color:
                      balance.type === 'owed' ? '#2E7D32' :
                      balance.type === 'owes' ? '#E65100' : '#666',
                  },
                ]}
              >
                {balance.text}
              </Text>
            </View>
          </View>
        </View>

        {isAdmin && !isCurrentUser && (
          <TouchableOpacity
            onPress={() => {
              setSelectedMember(item);
              setMenuVisible(item.userId._id);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="dots-vertical" size={24} color="#666" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.userId._id}
        renderItem={renderMemberItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Member Action Modal */}
      <Modal
        visible={!!menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(null)}
      >
        <TouchableOpacity
          style={styles.actionModalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(null)}
        >
          <View style={[styles.actionModalContainer, { backgroundColor: theme.colors.surface }]}>
            <TouchableOpacity
              style={styles.actionOption}
              disabled={selectedMember?.role === 'admin'}
              onPress={() => {
                const member = selectedMember;
                setMenuVisible(null);
                if (member) handleMakeAdmin(member);
              }}
            >
              <Icon
                name="crown"
                size={22}
                color={selectedMember?.role === 'admin' ? '#999' : theme.colors.primary}
              />
              <Text
                style={[
                  styles.actionOptionText,
                  selectedMember?.role === 'admin' && styles.disabledText,
                ]}
              >
                {i18n.t('make_admin')}
              </Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={styles.actionOption}
              onPress={() => {
                const member = selectedMember;
                setMenuVisible(null);
                if (member) handleRemoveMember(member);
              }}
            >
              <Icon name="account-remove" size={22} color="#F44336" />
              <Text style={[styles.actionOptionText, { color: '#F44336' }]}>
                {i18n.t('remove_member')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    elevation: 1,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: 12,
  },
  memberDetails: {
    flex: 1,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  realName: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  memberPhone: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  youBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youText: {
    fontSize: 10,
    color: '#1976D2',
    fontWeight: '600',
  },
  balanceBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  balanceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionModalContainer: {
    borderRadius: 14,
    paddingVertical: 8,
    width: '100%',
    maxWidth: 320,
    elevation: 5,
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  actionOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  actionDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16,
  },
  disabledText: {
    color: '#999',
  },
});

export default MemberList;
