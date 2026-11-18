import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTheme, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { reportService } from '../services/reportService';

const ReportsScreen = ({ navigation }) => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();

  const [period, setPeriod] = useState('this_month');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadReport = async () => {
    try {
      const response = await reportService.getOverview({ period });
      if (response?.data) {
        setReportData(response.data);
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadReport();
    }, [period])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReport();
    setRefreshing(false);
  };

  const handleExport = async () => {
    try {
      const res = await reportService.exportData();
      Alert.alert(
        t('success'),
        isAmharic
          ? `${res.count} የግብይት መረጃዎች በተሳካ ሁኔታ ተዘጋጅተዋል`
          : `Successfully exported ${res.count} transaction records.`
      );
    } catch (err) {
      Alert.alert(t('error'), 'Export failed');
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const summary = reportData?.summary || {
    totalIncome: 0,
    totalExpense: 0,
    netCashFlow: 0,
    savingsRate: 0,
    avgDailyExpense: 0,
  };

  const categories = reportData?.categorySpending || [];
  const accounts = reportData?.accountSpending || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Period Selector Tabs */}
      <View style={styles.periodRow}>
        {[
          { id: 'this_month', label: t('this_month') },
          { id: 'last_month', label: t('last_month') },
          { id: 'this_year', label: t('this_year') },
        ].map((tab) => {
          const isSelected = period === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.periodTab,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primary
                    : (theme.dark ? '#2A2A2A' : '#F0F0F0'),
                },
              ]}
              onPress={() => setPeriod(tab.id)}
            >
              <Text
                style={[
                  styles.periodTabText,
                  { color: isSelected ? '#FFF' : (theme.dark ? '#DDD' : '#555') },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* High-level Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.statCardTop}>
              <Icon name="arrow-down-bold-circle" size={20} color="#2E7D32" />
              <Text style={[styles.statLabel, { color: theme.dark ? '#AAA' : '#777' }]}>{t('income')}</Text>
            </View>
            <Text style={[styles.statValue, { color: '#2E7D32' }]}>
              +{summary.totalIncome.toLocaleString()} ETB
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.statCardTop}>
              <Icon name="arrow-up-bold-circle" size={20} color="#D32F2F" />
              <Text style={[styles.statLabel, { color: theme.dark ? '#AAA' : '#777' }]}>{t('expenses')}</Text>
            </View>
            <Text style={[styles.statValue, { color: '#D32F2F' }]}>
              -{summary.totalExpense.toLocaleString()} ETB
            </Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.statCardTop}>
              <Icon name="scale-balance" size={20} color="#1976D2" />
              <Text style={[styles.statLabel, { color: theme.dark ? '#AAA' : '#777' }]}>{t('net_cash_flow')}</Text>
            </View>
            <Text
              style={[
                styles.statValue,
                { color: summary.netCashFlow >= 0 ? '#2E7D32' : '#D32F2F' },
              ]}
            >
              {summary.netCashFlow >= 0 ? '+' : ''}{summary.netCashFlow.toLocaleString()} ETB
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.statCardTop}>
              <Icon name="piggy-bank" size={20} color="#6A1B9A" />
              <Text style={[styles.statLabel, { color: theme.dark ? '#AAA' : '#777' }]}>{t('savings_rate')}</Text>
            </View>
            <Text style={[styles.statValue, { color: '#6A1B9A' }]}>
              {summary.savingsRate}%
            </Text>
          </View>
        </View>

        {/* Transfers Excluded Note */}
        <View style={[styles.infoBanner, { backgroundColor: theme.dark ? '#222' : '#F5F5F5' }]}>
          <Icon name="information-outline" size={16} color={theme.dark ? '#AAA' : '#666'} />
          <Text style={[styles.infoBannerText, { color: theme.dark ? '#AAA' : '#666' }]}>
            {isAmharic
              ? 'በራስዎ ሒሳቦች መካከል የተደረጉ ዝውውሮች እንደ ገቢ ወይም ወጪ አልተቆጠሩም።'
              : 'Transfers between your personal accounts are excluded from income and expenses.'}
          </Text>
        </View>

        {/* Category Spending Breakdown */}
        <View style={styles.sectionTitleRow}>
          <Icon name="chart-pie" size={20} color={theme.colors.primary} />
          <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : '#222' }]}>
            {t('spending_analysis')} ({t('by_category')})
          </Text>
        </View>

        {categories.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.emptyText, { color: theme.dark ? '#AAA' : '#777' }]}>
              {isAmharic ? 'በዚህ ጊዜ ውስጥ ምንም የወጪ እንቅስቃሴ የለም' : 'No expense activity recorded for this period'}
            </Text>
          </View>
        ) : (
          <View style={[styles.reportCard, { backgroundColor: theme.colors.surface }]}>
            {categories.map((cat, idx) => (
              <View key={idx} style={styles.categoryRow}>
                <View style={styles.categoryHeader}>
                  <Text style={[styles.categoryName, { color: theme.dark ? '#FFF' : '#222' }]}>
                    {cat.category}
                  </Text>
                  <Text style={[styles.categoryAmount, { color: theme.dark ? '#FFF' : '#222' }]}>
                    {cat.total.toLocaleString()} ETB ({cat.percentage}%)
                  </Text>
                </View>

                <View style={[styles.categoryTrack, { backgroundColor: theme.dark ? '#333' : '#E8E8E8' }]}>
                  <View
                    style={[
                      styles.categoryFill,
                      {
                        width: `${cat.percentage}%`,
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Spending by Account */}
        <View style={styles.sectionTitleRow}>
          <Icon name="bank" size={20} color="#1976D2" />
          <Text style={[styles.sectionTitle, { color: theme.dark ? '#FFF' : '#222' }]}>
            {t('by_account')}
          </Text>
        </View>

        {accounts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.emptyText, { color: theme.dark ? '#AAA' : '#777' }]}>
              {isAmharic ? 'በዚህ ጊዜ ውስጥ ምንም የሒሳብ ወጪ የለም' : 'No account spending recorded for this period'}
            </Text>
          </View>
        ) : (
          <View style={[styles.reportCard, { backgroundColor: theme.colors.surface }]}>
            {accounts.map((acc, idx) => (
              <View key={idx} style={styles.accountRow}>
                <View style={styles.accountHeader}>
                  <Text style={[styles.accountName, { color: theme.dark ? '#FFF' : '#222' }]}>
                    {acc.accountName}
                  </Text>
                  <Text style={[styles.accountAmount, { color: '#D32F2F' }]}>
                    -{acc.total.toLocaleString()} ETB
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Export Data Button */}
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: theme.colors.primary }]}
          onPress={handleExport}
        >
          <Icon name="file-download-outline" size={20} color="#FFF" />
          <Text style={styles.exportBtnText}>
            {isAmharic ? 'የፋይናንስ መረጃን ላክ / አውርድ' : 'Export Financial Data (CSV / JSON)'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  periodRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  statCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginVertical: 10,
    gap: 8,
  },
  infoBannerText: {
    fontSize: 11,
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  reportCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  categoryRow: {
    marginBottom: 14,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryAmount: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  categoryTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryFill: {
    height: '100%',
    borderRadius: 4,
  },
  accountRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
  },
  accountAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyCard: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
  },
  exportBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    gap: 8,
  },
  exportBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ReportsScreen;
