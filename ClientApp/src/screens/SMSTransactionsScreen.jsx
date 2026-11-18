import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme, ActivityIndicator, FAB } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppDate } from '../utils/dateUtils';
import { smsService } from '../services/smsService';
import { accountService } from '../services/accountService';

const SAMPLE_SMS = [
  {
    label: 'TeleBirr Transfer (Expense)',
    text: 'Dear customer, you have transferred ETB 500.00 to 0911223344 (Abebe Kebede). Your current balance is ETB 1,450.50. Transaction ID: TD12345678.',
    sender: 'telebirr',
  },
  {
    label: 'TeleBirr Amharic (Income)',
    text: 'ክቡር ደንበኛ፣ 1,000.00 ብር ከ 0922334455 (አልማዝ አየለ) ገቢ ተደርጎልዎታል። ቀሪ ሒሳብዎ 2,200.50 ብር ነው። የግብይት ቁጥር: TR87654321',
    sender: 'telebirr',
  },
  {
    label: 'CBE Bank Credit (Income)',
    text: 'Dear customer, your account 1000******1234 has been credited with ETB 5,000.00 on 18/11/2026. Ref: FT263229988. Current Balance: ETB 15,400.00.',
    sender: 'CBE',
  },
];

const SMSTransactionsScreen = ({ navigation }) => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();
  const { formatDate } = useAppDate();

  const [unverifiedList, setUnverifiedList] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Paste / Simulator Modal
  const [pasteModalVisible, setPasteModalVisible] = useState(false);
  const [rawText, setRawText] = useState('');
  const [sender, setSender] = useState('telebirr');
  const [parsing, setParsing] = useState(false);

  // Confirm Modal
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedSMS, setSelectedSMS] = useState(null);
  const [confirmCategory, setConfirmCategory] = useState('');
  const [confirmDescription, setConfirmDescription] = useState('');
  const [confirmAccountId, setConfirmAccountId] = useState('');
  const [confirming, setConfirming] = useState(false);

  const loadData = async () => {
    try {
      const [smsRes, accountsRes] = await Promise.all([
        smsService.getUnverified(),
        accountService.getAccounts().catch(() => ({ data: [] })),
      ]);

      if (smsRes?.data) setUnverifiedList(smsRes.data);
      if (accountsRes?.data) setAccounts(accountsRes.data);
    } catch (error) {
      console.error('Error fetching SMS transactions:', error);
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

  const handleImportSMS = async () => {
    if (!rawText.trim()) {
      Alert.alert(t('error'), isAmharic ? 'እባክዎ የኤስኤምኤስ ጽሑፍ ያስገቡ' : 'Please paste an SMS text');
      return;
    }

    setParsing(true);
    try {
      const res = await smsService.importSms({
        rawMessage: rawText.trim(),
        sender,
      });

      if (res.importedCount > 0) {
        Alert.alert(t('success'), isAmharic ? 'ግብይቱ በተሳካ ሁኔታ ተገኝቷል!' : 'Transaction detected successfully!');
      } else if (res.duplicateCount > 0) {
        Alert.alert(t('info'), isAmharic ? 'ይህ ግብይት አስቀድሞ ተመዝግቧል (የተደገመ)' : 'This transaction already exists (Duplicate)');
      } else if (res.rejectedSecurityCount > 0) {
        Alert.alert(t('warning'), isAmharic ? 'የይለፍ ቃል ወይም የማረጋገጫ ኮድ በመሆኑ ውድቅ ተደርጓል' : 'Security OTP / Password message rejected');
      }

      setRawText('');
      setPasteModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert(t('error'), error.response?.data?.message || 'Failed to parse SMS');
    } finally {
      setParsing(false);
    }
  };

  const handleOpenConfirm = (item) => {
    setSelectedSMS(item);
    setConfirmCategory(item.detectedCategory || (item.type === 'income' ? 'Other Income' : 'Other Expense'));
    setConfirmDescription(`SMS ${item.provider.toUpperCase()}: ${item.counterparty || item.referenceNumber || 'Transaction'}`);
    setConfirmAccountId(item.matchedAccountId?._id || accounts[0]?._id || '');
    setConfirmModalVisible(true);
  };

  const handleConfirmSubmit = async () => {
    if (!confirmAccountId) {
      Alert.alert(t('error'), isAmharic ? 'እባክዎ ሒሳብ ይምረጡ' : 'Please select an account');
      return;
    }

    setConfirming(true);
    try {
      await smsService.confirmSms(selectedSMS._id, {
        accountId: confirmAccountId,
        category: confirmCategory,
        description: confirmDescription,
      });

      setConfirmModalVisible(false);
      setSelectedSMS(null);
      loadData();
    } catch (error) {
      Alert.alert(t('error'), error.response?.data?.message || 'Failed to confirm transaction');
    } finally {
      setConfirming(false);
    }
  };

  const handleReject = async (item) => {
    Alert.alert(
      t('reject_transaction'),
      isAmharic ? 'ይህን ግብይት ማስወገድ ይፈልጋሉ?' : 'Reject and discard this transaction?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('reject_transaction'),
          style: 'destructive',
          onPress: async () => {
            try {
              await smsService.rejectSms(item._id);
              loadData();
            } catch (err) {
              Alert.alert(t('error'), 'Could not reject transaction');
            }
          },
        },
      ]
    );
  };

  const renderHeader = () => (
    <View style={styles.headerWrap}>
      {/* Privacy Guarantee Card */}
      <View style={[styles.privacyCard, { backgroundColor: theme.dark ? '#1A291E' : '#E8F5E9' }]}>
        <View style={styles.privacyIconWrap}>
          <Icon name="shield-check" size={24} color="#2E7D32" />
        </View>
        <View style={styles.privacyTextWrap}>
          <Text style={[styles.privacyTitle, { color: '#2E7D32' }]}>
            {isAmharic ? 'የግላዊነት እና የደህንነት ጥበቃ' : 'Privacy & Security Guarantee'}
          </Text>
          <Text style={[styles.privacyDesc, { color: theme.dark ? '#CCC' : '#444' }]}>
            {isAmharic
              ? 'የባንክ ሚስጥር ቁጥር (PIN) ወይም የማረጋገጫ ኮድ (OTP) ፈጽሞ አይሰበሰብም፤ ከፋይናንስ ግብይቶች ውጭ ያሉ የግል መልዕክቶች አይቀመጡም።'
              : 'OTPs, passwords, and PINs are strictly ignored and never collected. Only financial transaction notices are parsed.'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.pasteButton, { backgroundColor: theme.colors.primary }]}
        onPress={() => setPasteModalVisible(true)}
      >
        <Icon name="content-paste" size={18} color="#FFF" />
        <Text style={styles.pasteButtonText}>{t('paste_sms')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSMSItem = ({ item }) => {
    const isIncome = item.type === 'income';
    const typeColor = isIncome ? '#2E7D32' : '#D32F2F';

    return (
      <View style={[styles.smsCard, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.badgeRow}>
          <View style={styles.unverifiedBadge}>
            <Icon name="clock-alert-outline" size={12} color="#F57C00" />
            <Text style={styles.unverifiedBadgeText}>{t('sms_imported_unverified')}</Text>
          </View>
          <View style={[styles.providerBadge, { backgroundColor: `${typeColor}15` }]}>
            <Text style={[styles.providerText, { color: typeColor }]}>
              {item.provider.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.smsMainRow}>
          <View style={styles.smsDetails}>
            <Text style={[styles.smsAmount, { color: typeColor }]}>
              {isIncome ? '+' : '-'}{item.amount.toLocaleString()} {item.currency}
            </Text>
            {item.counterparty ? (
              <Text style={[styles.counterparty, { color: theme.dark ? '#FFF' : '#333' }]} numberOfLines={1}>
                {isIncome ? 'From' : 'To'}: {item.counterparty}
              </Text>
            ) : null}
            <Text style={[styles.refText, { color: theme.dark ? '#AAA' : '#777' }]}>
              Ref: {item.referenceNumber || 'N/A'} • {formatDate(item.transactionDate, { includeTime: true })}
            </Text>
          </View>
        </View>

        <Text style={[styles.rawSnippet, { color: theme.dark ? '#888' : '#999' }]} numberOfLines={2}>
          {`"${item.rawMessage}"`}
        </Text>

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.confirmChip, { backgroundColor: theme.colors.primary }]}
            onPress={() => handleOpenConfirm(item)}
          >
            <Icon name="check" size={16} color="#FFF" />
            <Text style={styles.confirmChipText}>{t('confirm')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rejectChip}
            onPress={() => handleReject(item)}
          >
            <Icon name="close" size={16} color="#D32F2F" />
            <Text style={styles.rejectChipText}>{t('reject_transaction')}</Text>
          </TouchableOpacity>
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
        data={unverifiedList}
        keyExtractor={(item) => item._id}
        renderItem={renderSMSItem}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="email-check-outline" size={64} color="#2E7D32" />
            <Text style={[styles.emptyText, { color: theme.dark ? '#AAA' : '#888' }]}>
              {isAmharic ? 'ምንም ያልተረጋገጠ የኤስኤምኤስ ግብይት የለም። ሁሉም ተረጋግጠዋል!' : 'All detected transactions are verified! No pending SMS records.'}
            </Text>
          </View>
        }
      />

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="content-paste"
        onPress={() => setPasteModalVisible(true)}
      />

      {/* Paste / Simulator Modal */}
      <Modal visible={pasteModalVisible} animationType="slide" transparent onRequestClose={() => setPasteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFF' : '#222' }]}>
                {t('paste_sms')}
              </Text>
              <TouchableOpacity onPress={() => setPasteModalVisible(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#AAA' : '#666'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                {isAmharic ? 'የባንክ ወይም የቴሌብር ኤስኤምኤስ መልዕክት' : 'SMS Notification Text'} *
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                    color: theme.dark ? '#FFF' : '#000',
                  },
                ]}
                placeholder={isAmharic ? 'የኤስኤምኤስ መልዕክቱን እዚህ ይለጥፉ...' : 'Paste transaction SMS here...'}
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                value={rawText}
                onChangeText={setRawText}
              />

              <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555', marginTop: 10 }]}>
                {isAmharic ? 'ናሙና መልዕክቶች (ሙከራ)' : 'Try Sample Messages'}
              </Text>
              {SAMPLE_SMS.map((sample, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.sampleBtn, { backgroundColor: theme.dark ? '#2A2A2A' : '#F0F0F0' }]}
                  onPress={() => {
                    setRawText(sample.text);
                    setSender(sample.sender);
                  }}
                >
                  <Text style={[styles.sampleText, { color: theme.dark ? '#FFF' : '#333' }]}>
                    📌 {sample.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleImportSMS}
              disabled={parsing}
            >
              {parsing ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{t('parse_sms')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Confirm Modal */}
      <Modal visible={confirmModalVisible} animationType="slide" transparent onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFF' : '#222' }]}>
                {t('confirm_transaction')}
              </Text>
              <TouchableOpacity onPress={() => setConfirmModalVisible(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#AAA' : '#666'} />
              </TouchableOpacity>
            </View>

            {selectedSMS && (
              <ScrollView style={styles.modalBody}>
                <View style={[styles.confirmPreviewBox, { backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5' }]}>
                  <Text style={[styles.confirmAmount, { color: selectedSMS.type === 'income' ? '#2E7D32' : '#D32F2F' }]}>
                    {selectedSMS.type === 'income' ? '+' : '-'}{selectedSMS.amount.toLocaleString()} {selectedSMS.currency}
                  </Text>
                  <Text style={[styles.confirmMeta, { color: theme.dark ? '#AAA' : '#777' }]}>
                    Ref: {selectedSMS.referenceNumber || 'N/A'} • {selectedSMS.provider.toUpperCase()}
                  </Text>
                </View>

                <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                  {isAmharic ? 'መግለጫ' : 'Description'} *
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                      color: theme.dark ? '#FFF' : '#000',
                    },
                  ]}
                  value={confirmDescription}
                  onChangeText={setConfirmDescription}
                />

                <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                  {isAmharic ? 'ምድብ' : 'Category'}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                      color: theme.dark ? '#FFF' : '#000',
                    },
                  ]}
                  value={confirmCategory}
                  onChangeText={setConfirmCategory}
                />

                <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
                  {t('account')} *
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                  {accounts.map((acc) => {
                    const isSelected = confirmAccountId === acc._id;
                    return (
                      <TouchableOpacity
                        key={acc._id}
                        style={[
                          styles.accountPill,
                          {
                            backgroundColor: isSelected
                              ? (theme.dark ? '#1B381E' : '#E8F5E9')
                              : (theme.dark ? '#2A2A2A' : '#F0F0F0'),
                            borderColor: isSelected ? theme.colors.primary : 'transparent',
                          },
                        ]}
                        onPress={() => setConfirmAccountId(acc._id)}
                      >
                        <Icon name={acc.icon || 'bank'} size={16} color={isSelected ? theme.colors.primary : '#888'} />
                        <Text style={[styles.pillText, { color: isSelected ? theme.colors.primary : (theme.dark ? '#FFF' : '#333') }]}>
                          {acc.name} ({acc.balance} ETB)
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: theme.colors.primary, marginTop: 12 }]}
              onPress={handleConfirmSubmit}
              disabled={confirming}
            >
              {confirming ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>{t('confirm')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  headerWrap: {
    marginBottom: 16,
  },
  privacyCard: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
    gap: 10,
  },
  privacyIconWrap: {
    marginTop: 2,
  },
  privacyTextWrap: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  privacyDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  pasteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  pasteButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  smsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  unverifiedBadgeText: {
    color: '#F57C00',
    fontSize: 10,
    fontWeight: 'bold',
  },
  providerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  providerText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  smsMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  smsDetails: {
    flex: 1,
  },
  smsAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  counterparty: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  refText: {
    fontSize: 11,
    marginTop: 2,
  },
  rawSnippet: {
    fontSize: 11,
    fontStyle: 'italic',
    marginVertical: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  confirmChip: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  confirmChipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rejectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D32F2F',
    gap: 4,
  },
  rejectChipText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  textArea: {
    height: 90,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  textInput: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  sampleBtn: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  sampleText: {
    fontSize: 12,
  },
  confirmPreviewBox: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmAmount: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  confirmMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
    gap: 6,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SMSTransactionsScreen;
