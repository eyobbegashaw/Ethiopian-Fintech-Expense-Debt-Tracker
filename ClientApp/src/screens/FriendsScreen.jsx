import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,   
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import {
  Card,
  Avatar,
  useTheme,
  ActivityIndicator,
  Button,
  Chip,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../translations';
import { friendService } from '../services/friendService';
import { useAuth } from '../contexts/AuthContext';

const FriendsScreen = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');

  const loadData = async () => {
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        friendService.getFriends(),
        friendService.getPendingRequests(),
      ]);
      setFriends(Array.isArray(friendsRes.data) ? friendsRes.data : []);
      setRequests(Array.isArray(requestsRes.data) ? requestsRes.data : []);
    } catch (error) {
      console.error('Error loading friends data:', error);
      setFriends([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSendRequest = async () => {
    if (!phoneNumber) {
      Alert.alert(i18n.t('error'), i18n.t('phone_number_required'));
      return;
    }

    try {
      setSending(true);
      await friendService.sendFriendRequest(phoneNumber, message);
      Alert.alert(i18n.t('success'), i18n.t('friend_request_sent'));
      setShowAddFriend(false);
      setPhoneNumber('');
      setMessage('');
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    } finally {
      setSending(false);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await friendService.acceptFriendRequest(requestId);
      Alert.alert(i18n.t('success'), i18n.t('friend_request_accepted'));
      loadData();
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    }
  };

  const handleRejectRequest = async (requestId) => {
    Alert.alert(
      i18n.t('reject_request'),
      i18n.t('confirm_reject_request'),
      [
        { text: i18n.t('cancel'), style: 'cancel' },
        {
          text: i18n.t('reject'),
          style: 'destructive',
          onPress: async () => {
            try {
              await friendService.rejectFriendRequest(requestId);
              loadData();
            } catch (error) {
              Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
            }
          },
        },
      ]
    );
  };

  const renderFriend = ({ item }) => (
    <Card style={[styles.friendCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.friendContent}>
          {item.avatar ? (
            <Avatar.Image
              size={50}
              source={{ uri: item.avatar }}
              style={styles.avatar}
            />
          ) : (
            <Avatar.Text
              size={50}
              label={item.name?.charAt(0) || '?'}
              style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
            />
          )}
          <View style={styles.friendInfo}>
            <Text style={[styles.friendName, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>{item.name}</Text>
            <Text style={[styles.friendPhone, { color: theme.dark ? '#AAAAAA' : '#666666' }]}>{item.phone}</Text>
            <View style={styles.friendStats}>
              <Chip icon="cash" size="small" style={[styles.friendChip, { backgroundColor: theme.dark ? '#2A2A2A' : '#f0f0f0' }]}>
                {i18n.t('no_balance')}
              </Chip>
            </View>
          </View>
          <TouchableOpacity style={styles.messageButton}>
            <Icon name="message" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

  const renderRequest = ({ item }) => (
    <Card style={[styles.requestCard, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.requestContent}>
          {item.fromUser?.avatar ? (
            <Avatar.Image
              size={50}
              source={{ uri: item.fromUser.avatar }}
              style={styles.avatar}
            />
          ) : (
            <Avatar.Text
              size={50}
              label={item.fromUser?.name?.charAt(0) || '?'}
              style={[styles.avatar, { backgroundColor: '#FF9800' }]}
            />
          )}
          <View style={styles.requestInfo}>
            <Text style={[styles.requestName, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>{item.fromUser.name}</Text>
            <Text style={[styles.requestPhone, { color: theme.dark ? '#AAAAAA' : '#666666' }]}>{item.fromUser.phone}</Text>
            {item.message && (
              <Text style={[styles.requestMessage, { color: theme.dark ? '#CCCCCC' : '#666666' }]}>
                {`"${item.message}"`}
              </Text>
            )}
          </View>
          <View style={styles.requestActions}>
            <TouchableOpacity
              style={[styles.requestActionButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => handleAcceptRequest(item._id)}
            >
              <Icon name="check" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.requestActionButton, { backgroundColor: '#F44336' }]}
              onPress={() => handleRejectRequest(item._id)}
            >
              <Icon name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyFriends = () => (
    <View style={styles.emptyContainer}>
      <Icon name="account-group" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>{i18n.t('no_friends')}</Text>
      <Text style={styles.emptyText}>{i18n.t('add_friends_description')}</Text>
      <Button
        mode="contained"
        onPress={() => setShowAddFriend(true)}
        style={styles.addFriendButton}
        icon="account-plus"
      >
        {i18n.t('add_friend')}
      </Button>
    </View>
  );

  const renderEmptyRequests = () => (
    <View style={styles.emptyContainer}>
      <Icon name="bell-off" size={64} color="#ccc" />
      <Text style={[styles.emptyTitle, { color: theme.dark ? '#FFFFFF' : '#666' }]}>{i18n.t('no_requests')}</Text>
      <Text style={styles.emptyText}>{i18n.t('no_pending_requests')}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background, paddingTop: Math.max(insets.top, 8) }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with Add Friend Button */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.dark ? '#2C2C2C' : '#e0e0e0',
            paddingTop: Math.max(insets.top, 14),
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>{i18n.t('friends')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddFriend(true)}
        >
          <Icon name="account-plus" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface, borderBottomColor: theme.dark ? '#2C2C2C' : '#eee' }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, { color: theme.dark ? '#AAAAAA' : '#666666' }, activeTab === 'friends' && styles.tabTextActive]}>
            {i18n.t('friends')} ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[styles.tabText, { color: theme.dark ? '#AAAAAA' : '#666666' }, activeTab === 'requests' && styles.tabTextActive]}>
            {i18n.t('requests')} ({requests.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={activeTab === 'friends' ? friends : requests}
        keyExtractor={(item) => item._id}
        renderItem={activeTab === 'friends' ? renderFriend : renderRequest}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={activeTab === 'friends' ? renderEmptyFriends : renderEmptyRequests}
        contentContainerStyle={styles.listContent}
      />

      {/* Add Friend Modal */}
      {showAddFriend && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>{i18n.t('add_friend')}</Text>
              <TouchableOpacity onPress={() => setShowAddFriend(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#aaa' : '#666'} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalLabel, { color: theme.dark ? '#AAAAAA' : '#666666' }]}>{i18n.t('phone_number')}</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.dark ? '#262626' : '#fff',
                  color: theme.dark ? '#fff' : '#333',
                  borderColor: theme.dark ? '#3C3C3C' : '#ddd',
                },
              ]}
              placeholder="0912345678"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />

            <Text style={[styles.modalLabel, { color: theme.dark ? '#AAAAAA' : '#666666' }]}>{i18n.t('message_optional')}</Text>
            <TextInput
              style={[
                styles.modalInput,
                styles.messageInput,
                {
                  backgroundColor: theme.dark ? '#262626' : '#fff',
                  color: theme.dark ? '#fff' : '#333',
                  borderColor: theme.dark ? '#3C3C3C' : '#ddd',
                },
              ]}
              placeholder={i18n.t('add_message')}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />

            <View style={styles.modalFooter}>
              <Button
                mode="outlined"
                onPress={() => setShowAddFriend(false)}
                style={styles.modalButton}
              >
                {i18n.t('cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleSendRequest}
                loading={sending}
                disabled={sending}
                style={styles.modalButton}
              >
                {i18n.t('send_request')}
              </Button>
            </View>
          </View>
        </View>
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    padding: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
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
  listContent: {
    padding: 16,
  },
  friendCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  friendContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  friendPhone: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  friendStats: {
    marginTop: 4,
  },
  friendChip: {
    height: 24,
  },
  messageButton: {
    padding: 8,
  },
  requestCard: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#FFF8E1',
  },
  requestContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  requestPhone: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  requestMessage: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  requestActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  addFriendButton: {
    backgroundColor: '#2E7D32',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
  messageInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    minWidth: 100,
  },
});

export default FriendsScreen;
