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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../contexts/LanguageContext';
import GroupCard from '../components/Groups/GroupCard';
import CreateGroupModal from '../components/Groups/CreateGroupModal';
import EthiopianGregorianDatePicker from '../components/Common/EthiopianGregorianDatePicker';
import { groupService } from '../services/groupService';
import { accountService } from '../services/accountService';
import { useAuth } from '../contexts/AuthContext';
import { getTodayBanner, formatAppDate, toEthiopianDate } from '../utils/dateUtils';

// Safeguard against stale Fast Refresh closures
const gregorianToEthiopian = toEthiopianDate;

const HomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, isAmharic } = useLanguage();
  const [groups, setGroups] = useState([]);
  const [totalWealth, setTotalWealth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [calendarPickerVisible, setCalendarPickerVisible] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date().toISOString());

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

  // Live Ethio & Gregorian Date Strings
  const now = new Date();
  const ethFormatted =
    (typeof formatAppDate === 'function'
      ? formatAppDate(now, { calendar: 'ethiopian', language: isAmharic ? 'am' : 'en' })
      : '') ||
    (typeof gregorianToEthiopian === 'function' && gregorianToEthiopian(now)
      ? `${gregorianToEthiopian(now).monthNameAm || ''} ${gregorianToEthiopian(now).day}`
      : '') ||
    getTodayBanner('ethiopian', isAmharic ? 'am' : 'en');
  const gregFormatted =
    (typeof formatAppDate === 'function'
      ? formatAppDate(now, { calendar: 'gregorian', language: isAmharic ? 'am' : 'en' })
      : '') ||
    now.toLocaleDateString(isAmharic ? 'am-ET' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  const getGreeting = () => {
    const hour = now.getHours();
    if (isAmharic) {
      if (hour < 12) return 'መልካም ጧት';
      if (hour < 17) return 'መልካም ቀን';
      return 'መልካም ምሽት';
    }
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const renderEmpty = () => (
    <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.dark ? '#27412E' : '#E0E8E2' }]}>
      <View style={styles.emptyIconBadge}>
        <Icon name="account-group-outline" size={38} color="#D4AF37" />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.dark ? '#FFFFFF' : '#1C1B1F' }, isAmharic && styles.amharicFont]}>
        {isAmharic ? 'ምንም ማህበራዊ ቡድኖች አልተገኙም' : 'No Groups or Equbs Yet'}
      </Text>
      <Text style={[styles.emptyText, { color: theme.dark ? '#AAAAAA' : '#666666' }, isAmharic && styles.amharicFont]}>
        {isAmharic
          ? 'የወጪ መጋሪያ ቡድን፣ የእቁብ ወይም የእድር ሂሳብ በመፍጠር ከጓደኞችዎ ጋር ግልጽ የሆነ የገንዘብ እንቅስቃሴ ይጀምሩ።'
          : 'Create your first group, equb circle, or iddir ledger to seamlessly track shared expenses and debts.'}
      </Text>
      <TouchableOpacity
        style={[styles.emptyCtaButton, { backgroundColor: '#2E7D32' }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Icon name="plus-circle" size={18} color="#FFFFFF" />
        <Text style={[styles.emptyCtaText, isAmharic && styles.amharicFont]}>
          {isAmharic ? 'አዲስ ቡድን ፍጠር' : 'Create First Group'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => {
    const calendarType = user?.settings?.calendar || 'ethiopian';
    const activeDateBanner = getTodayBanner(calendarType, isAmharic ? 'am' : 'en');

    return (
      <View style={styles.headerContainer}>
        {/* Top User Greeting & Date Row */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.userInfoRow}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Profile')}
          >
            <View style={styles.avatarGlowContainer}>
              {user?.avatar ? (
                <Avatar.Image
                  size={46}
                  source={{ uri: user.avatar }}
                  style={styles.avatarStyle}
                />
              ) : (
                <Avatar.Text
                  size={46}
                  label={user?.name?.charAt(0) || 'እ'}
                  style={[styles.avatarStyle, { backgroundColor: '#0D381E' }]}
                  color="#D4AF37"
                />
              )}
              <View style={styles.onlineStatusIndicator} />
            </View>

            <View style={styles.greetingTextColumn}>
              <Text style={[styles.greetingSub, { color: theme.dark ? '#8FB49A' : '#4E7356' }, isAmharic && styles.amharicFont]}>
                {getGreeting()} 👋
              </Text>
              <Text style={[styles.userNameTitle, { color: theme.dark ? '#FFFFFF' : '#1C1B1F' }]} numberOfLines={1}>
                {user?.name || (isAmharic ? 'ተጠቃሚ' : 'User')}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Action Add Dual Calendar Chip */}
          <TouchableOpacity
            style={[
              styles.dualCalendarChip,
              {
                backgroundColor: theme.dark ? '#112D1B' : '#E8F5E9',
                borderColor: theme.dark ? '#225530' : '#C8E6C9',
              },
            ]}
            onPress={() => setCalendarPickerVisible(true)}
            activeOpacity={0.8}
          >
            <Icon name="calendar-sync" size={16} color="#2E7D32" />
            <View style={styles.calendarTextCol}>
              <Text style={[styles.calendarBadgeMain, { color: theme.colors.primary }, isAmharic && styles.amharicFont]}>
                {ethFormatted}
              </Text>
              <Text style={[styles.calendarBadgeSub, { color: theme.dark ? '#8FA393' : '#666' }]}>
                {gregFormatted}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Luxury Emerald Net Worth Card */}
        <View style={styles.emeraldHeroCard}>
          <View style={styles.emeraldCardGlowOrb} />
          
          <View style={styles.emeraldCardHeader}>
            <View style={styles.brandBadgeRow}>
              <View style={styles.brandIconCircle}>
                <Text style={styles.brandEmblemLetter}>እ</Text>
              </View>
              <Text style={styles.brandBadgeTitle}>እልፍ FINTECH</Text>
            </View>
            
            <TouchableOpacity
              style={styles.visibilityToggleBtn}
              onPress={() => setShowBalance(!showBalance)}
              activeOpacity={0.7}
            >
              <Icon
                name={showBalance ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color="#C5E1A5"
              />
            </TouchableOpacity>
          </View>

          {/* Total Wealth Display */}
          <View style={styles.balanceContainer}>
            <Text style={[styles.balanceLabel, isAmharic && styles.amharicFont]}>
              {t('net_worth')} ({t('total_balance')})
            </Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountNumber}>
                {showBalance
                  ? totalWealth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : '••••••••'}
              </Text>
              <Text style={styles.amountCurrency}>ETB</Text>
            </View>
          </View>

          {/* Card Footer Quick Actions */}
          <View style={styles.heroFooterRow}>
            <TouchableOpacity
              style={styles.heroActionPill}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Finance')}
            >
              <Icon name="wallet-outline" size={15} color="#D4AF37" />
              <Text style={[styles.heroActionText, isAmharic && styles.amharicFont]}>
                {isAmharic ? 'የፋይናንስ ዳሽቦርድ' : 'Finance Center'} →
              </Text>
            </TouchableOpacity>

            <View style={styles.heroBadgeRight}>
              <Icon name="shield-check" size={14} color="#81C784" />
              <Text style={styles.heroBadgeText}>{activeDateBanner}</Text>
            </View>
          </View>
        </View>

        {/* 4-Item Quick Action Bar ("Action Add" & Core Shortcuts) */}
        <View style={styles.quickActionsContainer}>
          {/* Action 1: Add Expense */}
          <TouchableOpacity
            style={[
              styles.actionBox,
              { backgroundColor: theme.colors.surface, borderColor: theme.dark ? '#22402A' : '#E2EBE4' },
            ]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('AddExpense')}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#E8F5E9' }]}>
              <Icon name="cash-minus" size={22} color="#2E7D32" />
            </View>
            <Text style={[styles.actionLabel, { color: theme.dark ? '#FFFFFF' : '#1C1B1F' }, isAmharic && styles.amharicFont]}>
              {isAmharic ? 'ወጪ መዝግብ' : 'Add Expense'}
            </Text>
          </TouchableOpacity>

          {/* Action 2: Create Group / Equb */}
          <TouchableOpacity
            style={[
              styles.actionBox,
              { backgroundColor: theme.colors.surface, borderColor: theme.dark ? '#22402A' : '#E2EBE4' },
            ]}
            activeOpacity={0.8}
            onPress={() => setModalVisible(true)}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#FFF8E1' }]}>
              <Icon name="account-multiple-plus" size={22} color="#D4AF37" />
            </View>
            <Text style={[styles.actionLabel, { color: theme.dark ? '#FFFFFF' : '#1C1B1F' }, isAmharic && styles.amharicFont]}>
              {isAmharic ? 'አዲስ ቡድን' : 'New Group'}
            </Text>
          </TouchableOpacity>

          {/* Action 3: Settle Debts */}
          <TouchableOpacity
            style={[
              styles.actionBox,
              { backgroundColor: theme.colors.surface, borderColor: theme.dark ? '#22402A' : '#E2EBE4' },
            ]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Balances')}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#E0F2F1' }]}>
              <Icon name="scale-balance" size={22} color="#00897B" />
            </View>
            <Text style={[styles.actionLabel, { color: theme.dark ? '#FFFFFF' : '#1C1B1F' }, isAmharic && styles.amharicFont]}>
              {isAmharic ? 'ማወራረድ' : 'Settle Up'}
            </Text>
          </TouchableOpacity>

          {/* Action 4: Calendar Action Add */}
          <TouchableOpacity
            style={[
              styles.actionBox,
              { backgroundColor: theme.colors.surface, borderColor: theme.dark ? '#22402A' : '#E2EBE4' },
            ]}
            activeOpacity={0.8}
            onPress={() => setCalendarPickerVisible(true)}
          >
            <View style={[styles.actionIconWrap, { backgroundColor: '#EDE7F6' }]}>
              <Icon name="calendar-month" size={22} color="#5E35B1" />
            </View>
            <Text style={[styles.actionLabel, { color: theme.dark ? '#FFFFFF' : '#1C1B1F' }, isAmharic && styles.amharicFont]}>
              {isAmharic ? 'ቀን መቁጠሪያ' : 'Calendar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Micro-metrics Row */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.dark ? '#203926' : '#E5EBE6' }]}>
            <Icon name="account-group" size={16} color="#2E7D32" />
            <Text style={[styles.metricValue, { color: theme.dark ? '#FFF' : '#1C1B1F' }]}>
              {groups.length}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.dark ? '#8FA393' : '#666' }, isAmharic && styles.amharicFont]}>
              {isAmharic ? 'ቡድኖች' : 'Groups'}
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.dark ? '#203926' : '#E5EBE6' }]}>
            <Icon name="cash-sync" size={16} color="#D4AF37" />
            <Text style={[styles.metricValue, { color: theme.dark ? '#FFF' : '#1C1B1F' }]}>
              {groups.filter(g => g.type === 'equb').length}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.dark ? '#8FA393' : '#666' }, isAmharic && styles.amharicFont]}>
              {isAmharic ? 'እቁቦች' : 'Equbs'}
            </Text>
          </View>

          <View style={[styles.metricCard, { backgroundColor: theme.colors.surface, borderColor: theme.dark ? '#203926' : '#E5EBE6' }]}>
            <Icon name="shield-check-outline" size={16} color="#43A047" />
            <Text style={[styles.metricValue, { color: '#43A047' }]}>
              100%
            </Text>
            <Text style={[styles.metricLabel, { color: theme.dark ? '#8FA393' : '#666' }, isAmharic && styles.amharicFont]}>
              {isAmharic ? 'ደህንነት' : 'Private'}
            </Text>
          </View>
        </View>

        {/* Section Heading */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionTitleWithIcon}>
            <View style={styles.sectionIconBadge}>
              <Icon name="account-group" size={17} color="#2E7D32" />
            </View>
            <Text style={[styles.sectionTitleText, { color: theme.dark ? '#FFFFFF' : '#1C1B1F' }, isAmharic && styles.amharicFont]}>
              {isAmharic ? 'የእኔ ማህበራዊ ቡድኖች እና እቁቦች' : 'Social Groups & Equbs'}
            </Text>
            <View style={[styles.countBadge, { backgroundColor: theme.dark ? '#183820' : '#E8F5E9' }]}>
              <Text style={[styles.countBadgeText, { color: theme.colors.primary }]}>{groups.length}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.createGroupMiniBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.8}
          >
            <Icon name="plus" size={14} color="#2E7D32" />
            <Text style={[styles.createGroupMiniText, isAmharic && styles.amharicFont]}>
              {isAmharic ? 'አዲስ' : 'New'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background, paddingTop: Math.max(insets.top, 8) }]}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={[styles.loadingText, { color: theme.dark ? '#AAA' : '#666' }, isAmharic && styles.amharicFont]}>
          {isAmharic ? 'እልፍ በመጫን ላይ...' : 'Loading Ilf Fintech...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: Math.max(insets.top, 8) }]}>
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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2E7D32']}
            tintColor="#2E7D32"
          />
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={groups.length === 0 ? styles.emptyList : styles.list}
      />

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        color="#FFFFFF"
        onPress={() => setModalVisible(true)}
      />

      {/* Group Creation Modal */}
      <CreateGroupModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => {
          setModalVisible(false);
          loadData();
        }}
        userId={user?._id}
      />

      {/* Interactive Dual Calendar Picker (Action Add) */}
      <EthiopianGregorianDatePicker
        visible={calendarPickerVisible}
        onClose={() => setCalendarPickerVisible(false)}
        onDismiss={() => setCalendarPickerVisible(false)}
        selectedDate={selectedCalendarDate}
        onSelectDate={(isoDate) => {
          setSelectedCalendarDate(isoDate);
          setCalendarPickerVisible(false);
        }}
        onConfirm={(d) => {
          setSelectedCalendarDate(d.toISOString());
          setCalendarPickerVisible(false);
        }}
        title={isAmharic ? 'የኢትዮጵያ እና ጎርጎሪዮሳዊ የቀን መቁጠሪያ' : 'Ethiopian & Gregorian Calendar'}
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
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    padding: 16,
    paddingBottom: 90,
  },
  emptyList: {
    padding: 16,
    paddingBottom: 90,
    flexGrow: 1,
  },
  headerContainer: {
    marginBottom: 8,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatarGlowContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarStyle: {
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  onlineStatusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  greetingTextColumn: {
    flex: 1,
  },
  greetingSub: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  userNameTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  dualCalendarChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    gap: 7,
  },
  calendarTextCol: {
    alignItems: 'flex-start',
  },
  calendarBadgeMain: {
    fontSize: 11,
    fontWeight: '700',
  },
  calendarBadgeSub: {
    fontSize: 9.5,
    fontWeight: '500',
  },

  /* Luxury Emerald Hero Card */
  emeraldHeroCard: {
    backgroundColor: '#0A2E16',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#1E5830',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(10, 46, 22, 0.28)',
      },
      default: {
        elevation: 6,
      },
    }),
  },
  emeraldCardGlowOrb: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
  },
  emeraldCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#D4AF37',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandEmblemLetter: {
    color: '#0A2E16',
    fontSize: 14,
    fontWeight: 'bold',
  },
  brandBadgeTitle: {
    color: '#D4AF37',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  visibilityToggleBtn: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  balanceContainer: {
    marginBottom: 16,
  },
  balanceLabel: {
    color: '#A8D5B5',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  amountNumber: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  amountCurrency: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '800',
  },
  heroFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 12,
  },
  heroActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  heroActionText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  heroBadgeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  heroBadgeText: {
    color: '#C8E6C9',
    fontSize: 10.5,
    fontWeight: '600',
  },

  /* 4-Item Quick Action Bar */
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  actionBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 7,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  /* Micro-metrics Row */
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  /* Section Heading */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitleText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  createGroupMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
  },
  createGroupMiniText: {
    color: '#2E7D32',
    fontSize: 11.5,
    fontWeight: '700',
  },

  /* Empty State Card */
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    marginTop: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  emptyIconBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  emptyCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },

  amharicFont: {
    fontFamily: 'Noto Serif Ethiopic, "material-community", "Material Design Icons", sans-serif',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2E7D32',
    borderRadius: 28,
  },
});

export default HomeScreen;