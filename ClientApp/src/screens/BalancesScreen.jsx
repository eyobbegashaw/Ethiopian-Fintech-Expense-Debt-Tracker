import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Card,
  useTheme,
  ActivityIndicator,
  Avatar,
  Chip,
} from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../translations';
import { groupService } from '../services/groupService';
import { settlementService } from '../services/settlementService';
import { useAuth } from '../contexts/AuthContext';
import SimplifyDebtsModal from '../components/Balances/SimplifyDebtsModal';

const BalancesScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showSimplifyModal, setShowSimplifyModal] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalOwes, setTotalOwes] = useState(0);

  const loadGroups = async () => {
    try {
      const response = await groupService.getGroups();
      setGroups(response.data);
      calculateTotals(response.data);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = (groupsData) => {
    let owed = 0;
    let owes = 0;
    
    groupsData.forEach(group => {
      if (group.userBalance > 0) {
        owed += group.userBalance;
      } else if (group.userBalance < 0) {
        owes += Math.abs(group.userBalance);
      }
    });
    
    setTotalOwed(owed);
    setTotalOwes(owes);
    setTotalBalance(owed - owes);
  };

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  };

  const handleSettleAll = () => {
    Alert.alert(
      i18n.t('settle_all'),
      i18n.t('confirm_settle_all'),
      [
        { text: i18n.t('cancel'), style: 'cancel' },
        {
          text: i18n.t('continue'),
          onPress: () => {
            // Navigate to settlement flow
            Alert.alert(i18n.t('info'), i18n.t('settle_all_feature_coming'));
          },
        },
      ]
    );
  };

  const getOverallBalanceColor = () => {
    if (totalBalance > 0) return '#4CAF50';
    if (totalBalance < 0) return '#F44336';
    return '#999';
  };

  const getOverallBalanceIcon = () => {
    if (totalBalance > 0) return 'arrow-up-bold-circle-outline';
    if (totalBalance < 0) return 'arrow-down-bold-circle-outline';
    return 'check-circle-outline';
  };

  const getOverallBalanceText = () => {
    const absBalance = Math.abs(totalBalance);
    if (totalBalance > 0) {
      return `${i18n.t('you_are_owed_total')} ${absBalance} ETB`;
    }
    if (totalBalance < 0) {
      return `${i18n.t('you_owe_total')} ${absBalance} ETB`;
    }
    return i18n.t('all_settled_up');
  };

  const renderGroupBalance = (group) => {
    const isOwed = group.userBalance > 0;
    const isOwes = group.userBalance < 0;
    const absBalance = Math.abs(group.userBalance);

    return (
      <TouchableOpacity
        key={group._id}
        style={styles.groupCard}
        onPress={() => navigation.navigate('Group', { groupId: group._id })}
      >
        <Card>
          <Card.Content>
            <View style={styles.groupCardContent}>
              <View style={styles.groupIconContainer}>
                <Text style={styles.groupIcon}>{group.icon || '👥'}</Text>
              </View>
              <View style={styles.groupBalanceInfo}>
                <Text style={styles.groupName}>{group.name}</Text>
                <View
                  style={[
                    styles.groupBalanceBadge,
                    {
                      backgroundColor: isOwed ? '#4CAF50' : isOwes ? '#FF9800' : '#E8F5E9',
                    },
                  ]}
                >
                  <Icon
                    name={isOwed ? 'arrow-up' : isOwes ? 'arrow-down' : 'check'}
                    size={14}
                    color={isOwed ? '#fff' : isOwes ? '#fff' : '#666'}
                  />
                  <Text
                    style={[
                      styles.groupBalanceText,
                      { color: isOwed ? '#fff' : isOwes ? '#fff' : '#666' },
                    ]}
                  >
                    {isOwed
                      ? `${i18n.t('owed')} ${absBalance}`
                      : isOwes
                      ? `${i18n.t('owes')} ${absBalance}`
                      : i18n.t('settled')}
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color="#ccc" />
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Overall Balance Card */}
        <Card style={styles.overallCard}>
          <Card.Content>
            <Text style={styles.overallTitle}>{i18n.t('overall_balance')}</Text>
            <View style={styles.overallBalance}>
              <Icon
                name={getOverallBalanceIcon()}
                size={48}
                color={getOverallBalanceColor()}
              />
              <Text
                style={[
                  styles.overallBalanceAmount,
                  { color: getOverallBalanceColor() },
                ]}
              >
                {Math.abs(totalBalance)} ETB
              </Text>
            </View>
            <Text style={styles.overallBalanceText}>
              {getOverallBalanceText()}
            </Text>
          </Card.Content>
        </Card>

        {/* Summary Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statsCard}>
            <Card.Content style={styles.statsContent}>
              <Icon name="arrow-up-bold" size={24} color="#4CAF50" />
              <Text style={styles.statsLabel}>{i18n.t('total_owed_to_you')}</Text>
              <Text style={[styles.statsAmount, { color: '#4CAF50' }]}>
                {totalOwed} ETB
              </Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.statsCard}>
            <Card.Content style={styles.statsContent}>
              <Icon name="arrow-down-bold" size={24} color="#F44336" />
              <Text style={styles.statsLabel}>{i18n.t('total_you_owe')}</Text>
              <Text style={[styles.statsAmount, { color: '#F44336' }]}>
                {totalOwes} ETB
              </Text>
            </Card.Content>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: '#FF9800' }]}
            onPress={() => {
              if (groups.length > 0) {
                setSelectedGroup(groups[0]);
                setShowSimplifyModal(true);
              } else {
                Alert.alert(i18n.t('info'), i18n.t('no_groups_to_simplify'));
              }
            }}
          >
            <Icon name="calculator" size={20} color="#fff" />
            <Text style={styles.quickActionText}>{i18n.t('simplify_all_debts')}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: '#2E7D32' }]}
            onPress={handleSettleAll}
          >
            <Icon name="cash-check" size={20} color="#fff" />
            <Text style={styles.quickActionText}>{i18n.t('settle_all')}</Text>
          </TouchableOpacity>
        </View>

        {/* Groups Section */}
        <View style={styles.groupsSection}>
          <Text style={styles.sectionTitle}>{i18n.t('balances_by_group')}</Text>
          {groups.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="folder-open" size={48} color="#ccc" />
              <Text style={styles.emptyText}>{i18n.t('no_groups')}</Text>
            </View>
          ) : (
            groups.map(renderGroupBalance)
          )}
        </View>
      </ScrollView>

      {selectedGroup && (
        <SimplifyDebtsModal
          visible={showSimplifyModal}
          onClose={() => {
            setShowSimplifyModal(false);
            setSelectedGroup(null);
          }}
          debts={selectedGroup.simplifiedDebts || []}
          groupId={selectedGroup._id}
          onSuccess={loadGroups}
        />
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
  overallCard: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 3,
  },
  overallTitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  overallBalance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 8,
  },
  overallBalanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  overallBalanceText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statsCard: {
    flex: 1,
    borderRadius: 12,
  },
  statsContent: {
    alignItems: 'center',
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  statsAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  groupsSection: {
    paddingHorizontal: 16,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  groupCard: {
    marginBottom: 12,
  },
  groupCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupIcon: {
    fontSize: 24,
  },
  groupBalanceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  groupBalanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  groupBalanceText: {
    fontSize: 11,
    fontWeight: '600',
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

export default BalancesScreen;