import React, { useState, useEffect, useCallback } from 'react';
import {
  View,    
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Avatar,
  useTheme,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import moment from 'moment';
import i18n from '../translations';
import { activityService } from '../services/activityService';
import { useAuth } from '../contexts/AuthContext';

const ActivityScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadActivities = async () => {
    try {
      const response = await activityService.getActivities(filter);
      setActivities(response.data);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [filter])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'expense':
        return 'receipt';
      case 'settlement':
        return 'cash-check';
      case 'member_joined':
        return 'account-plus';
      case 'member_left':
        return 'account-minus';
      case 'group_created':
        return 'account-group';
      default:
        return 'bell';
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'expense':
        return '#FF9800';
      case 'settlement':
        return '#4CAF50';
      case 'member_joined':
        return '#2196F3';
      case 'member_left':
        return '#F44336';
      case 'group_created':
        return '#9C27B0';
      default:
        return '#666';
    }
  };

  const getActivityTitle = (activity) => {
    switch (activity.type) {
      case 'expense':
        return `${activity.user.name} ${i18n.t('added_expense')} ${activity.description}`;
      case 'settlement':
        return `${activity.user.name} ${i18n.t('settled')} ${activity.amount} ETB`;
      case 'member_joined':
        return `${activity.user.name} ${i18n.t('joined_group')} ${activity.groupName}`;
      case 'member_left':
        return `${activity.user.name} ${i18n.t('left_group')} ${activity.groupName}`;
      case 'group_created':
        return `${activity.user.name} ${i18n.t('created_group')} ${activity.groupName}`;
      default:
        return activity.description;
    }
  };

  const renderActivity = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        if (item.groupId) {
          navigation.navigate('Group', { groupId: item.groupId });
        }
      }}
    >
      <Card style={styles.activityCard}>
        <Card.Content>
          <View style={styles.activityContent}>
            <View
              style={[
                styles.activityIcon,
                { backgroundColor: getActivityColor(item.type) + '15' },
              ]}
            >
              <Icon
                name={getActivityIcon(item.type)}
                size={24}
                color={getActivityColor(item.type)}
              />
            </View>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>
                {getActivityTitle(item)}
              </Text>
              <Text style={styles.activityTime}>
                {moment(item.createdAt).fromNow()}
              </Text>
              {item.groupName && (
                <Chip
                  icon="account-group"
                  style={styles.groupChip}
                  textStyle={styles.groupChipText}
                >
                  {item.groupName}
                </Chip>
              )}
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="bell-off" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>{i18n.t('no_activity')}</Text>
      <Text style={styles.emptyText}>
        {i18n.t('no_activity_description')}
      </Text>
    </View>
  );

  const filters = [
    { value: 'all', label: i18n.t('all') },
    { value: 'expenses', label: i18n.t('expenses') },
    { value: 'settlements', label: i18n.t('settlements') },
    { value: 'groups', label: i18n.t('groups') },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('recent_activity')}</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {filters.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[
              styles.filterChip,
              filter === f.value && styles.filterChipActive,
            ]}
            onPress={() => setFilter(f.value)}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.value && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Activity List */}
      <FlatList
        data={activities}
        keyExtractor={(item) => item._id}
        renderItem={renderActivity}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={activities.length === 0 ? styles.emptyList : styles.listContent}
      />
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
  filtersContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  filterChipActive: {
    backgroundColor: '#E8F5E9',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  filterTextActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  groupChip: {
    backgroundColor: '#f0f0f0',
    height: 24,
    alignSelf: 'flex-start',
  },
  groupChipText: {
    fontSize: 10,
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
  },
});

export default ActivityScreen;
