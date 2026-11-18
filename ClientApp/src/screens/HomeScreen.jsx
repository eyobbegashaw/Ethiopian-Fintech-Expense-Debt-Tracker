import React, { useState, useCallback } from 'react';
import {   
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { FAB, useTheme, ActivityIndicator, Avatar } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import GroupCard from '../components/Groups/GroupCard';
import CreateGroupModal from '../components/Groups/CreateGroupModal';
import { groupService } from '../services/groupService';
import { accountService } from '../services/accountService';
import { useAuth } from '../contexts/AuthContext';
import { getTodayBanner } from '../utils/dateUtils';

const HomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const { t, isAmharic } = useLanguage();
  const [groups, setGroups] = useState([]);
  const [totalWealth, setTotalWealth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const loadData = async () => {
    try {
      const [groupsRes, accountsRes] = await Promise.all([
        groupService.getGroups().catch(() => ({ data: [] })),
        accountService.getAccounts().catch(() => ({ totalBalance: 0 })),
      ]);

      setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
      setTotalWealth(accountsRes.totalBalance || 0);
    } catch (error) {
      console.error('Error loading home data:', error);
      setGroups([]);
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

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>👥</Text>
      <Text style={[styles.emptyTitle, { color: theme.dark ? '#FFFFFF' : '#666' }, isAmharic && styles.amharicFont]}>
        {t('no_groups')}
      </Text>
      <Text style={[styles.emptyText, { color: theme.dark ? '#AAAAAA' : '#999' }, isAmharic && styles.amharicFont]}>
        {t('create_first_group_description')}
      </Text>
    </View>
  );

  const renderHeader = () => {
    const calendarType = user?.settings?.calendar || 'ethiopian';
    const dateText = getTodayBanner(calendarType, isAmharic ? 'am' : 'en');

    return (
      <View style={styles.headerWrap}>
        {/* User Profile Card */}
        <TouchableOpacity
          style={[
            styles.userHeaderCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.dark ? '#333' : '#e4e4e4',
            },
          ]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.userHeaderLeft}>
            {user?.avatar ? (
              <Avatar.Image
                size={48}
                source={{ uri: user.avatar }}
                style={styles.headerAvatar}
              />
            ) : (
              <Avatar.Text
                size={48}
                label={user?.name?.charAt(0) || 'U'}
                style={[styles.headerAvatar, { backgroundColor: theme.colors.primary }]}
              />
            )}
            <View style={styles.userHeaderTextWrap}>
              <Text style={[styles.greetingSubtext, { color: theme.dark ? '#AAA' : '#777' }]}>
                {isAmharic ? 'እንኳን ደህና መጡ 👋' : 'Welcome back 👋'}
              </Text>
              <Text style={[styles.userNameText, { color: theme.dark ? '#FFF' : '#222' }]} numberOfLines={1}>
                {user?.name || 'User'}
              </Text>
            </View>
          </View>

          <View style={[styles.calendarBadge, { backgroundColor: theme.dark ? '#1B381E' : '#E8F5E9' }]}>
            <Icon name="calendar-month-outline" size={13} color={theme.colors.primary} />
            <Text style={[styles.calendarBadgeText, { color: theme.colors.primary }]}>
              {dateText}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Financial Wealth Summary Banner */}
        <TouchableOpacity
          style={[
            styles.financeHeroCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.dark ? '#333' : '#e4e4e4',
            },
          ]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Finance')}
        >
          <View style={styles.financeHeroLeft}>
            <View style={[styles.financeIconWrap, { backgroundColor: theme.dark ? '#1B381E' : '#E8F5E9' }]}>
              <Icon name="wallet" size={24} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={[styles.financeHeroLabel, { color: theme.dark ? '#AAA' : '#777' }]}>
                {t('net_worth')} ({t('total_balance')})
              </Text>
              <Text style={[styles.financeHeroAmount, { color: theme.colors.primary }]}>
                {totalWealth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB
              </Text>
            </View>
          </View>

          <View style={[styles.openFinanceChip, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.openFinanceText}>{t('finance')} →</Text>
          </View>
        </TouchableOpacity>

        {/* Section Heading for Groups */}
        <View style={styles.sectionHeadingRow}>
          <Icon name="account-group" size={18} color={theme.colors.primary} />
          <Text style={[styles.sectionHeadingText, { color: theme.dark ? '#FFF' : '#222' }]}>
            {isAmharic ? 'የእኔ ማህበራዊ ቡድኖች እና እቁቦች' : 'Social Groups & Equbs'} ({groups.length})
          </Text>
        </View>
      </View>
    );
  };

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
        data={groups}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            onPress={() => navigation.navigate('Group', { groupId: item._id })}
          />
        )}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={groups.length === 0 ? styles.emptyList : styles.list}
      />
      
      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => setModalVisible(true)}
      />

      <CreateGroupModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          setModalVisible(false);
          loadData();
        }}
        userId={user?._id}
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
  list: {
    padding: 16,
    paddingBottom: 80,
  },
  headerWrap: {
    marginBottom: 10,
  },
  userHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  userHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  headerAvatar: {
    marginRight: 12,
  },
  userHeaderTextWrap: {
    flex: 1,
  },
  greetingSubtext: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  calendarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  calendarBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  financeHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  financeHeroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  financeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  financeHeroLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  financeHeroAmount: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  openFinanceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  openFinanceText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionHeadingText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  amharicFont: {
    fontFamily: 'Noto Serif Ethiopic, "material-community", "Material Design Icons", sans-serif',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default HomeScreen;
