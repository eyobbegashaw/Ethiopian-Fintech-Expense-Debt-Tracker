
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Checkbox, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Avatar from './Avatar';
import i18n from '../../translations';

const FriendSelector = ({ friends, selectedFriends, onSelect, multiSelect = true }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (friend.phone && friend.phone.includes(searchQuery))
  );

  const toggleSelect = (friend) => {
    if (multiSelect) {
      const isSelected = selectedFriends.some(f => f._id === friend._id);
      if (isSelected) {
        onSelect(selectedFriends.filter(f => f._id !== friend._id));
      } else {
        onSelect([...selectedFriends, friend]);
      }
    } else {
      onSelect(friend);
    }
  };

  const renderFriend = ({ item }) => {
    const isSelected = multiSelect
      ? selectedFriends.some(f => f._id === item._id)
      : selectedFriends?._id === item._id;

    return (
      <TouchableOpacity
        style={styles.friendItem}
        onPress={() => toggleSelect(item)}
      >
        <View style={styles.friendInfo}>
          <Avatar name={item.name} size={40} />
          <View style={styles.friendDetails}>
            <Text style={styles.friendName}>{item.name}</Text>
            {item.nickname && (
              <Text style={styles.friendNickname}>@{item.nickname}</Text>
            )}
            {item.phone && (
              <Text style={styles.friendPhone}>{item.phone}</Text>
            )}
          </View>
        </View>
        {multiSelect ? (
          <Checkbox
            status={isSelected ? 'checked' : 'unchecked'}
            onPress={() => toggleSelect(item)}
            color={theme.colors.primary}
          />
        ) : (
          <Icon
            name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
            size={24}
            color={isSelected ? theme.colors.primary : '#ccc'}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder={i18n.t('search_friends')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredFriends}
        keyExtractor={(item) => item._id}
        renderItem={renderFriend}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-off" size={48} color="#ccc" />
            <Text style={styles.emptyText}>{i18n.t('no_friends')}</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  listContent: {
    paddingBottom: 16,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  friendDetails: {
    marginLeft: 12,
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  friendNickname: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  friendPhone: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
});

export default FriendSelector;