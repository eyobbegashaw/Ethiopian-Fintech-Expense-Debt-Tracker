import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useTheme, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../../contexts/LanguageContext';
import { accountService } from '../../services/accountService';

const TransferModal = ({ visible, onClose, onSuccess, accounts = [] }) => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();

  const [fromAccountId, setFromAccountId] = useState(accounts[0]?._id ?? '');
  const [toAccountId, setToAccountId] = useState(accounts[1]?._id ?? '');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTransfer = async () => {
    if (!fromAccountId || !toAccountId) {
      Alert.alert(t('error'), isAmharic ? 'እባክዎ መነሻ እና መድረሻ ሒሳቦችን ይምረጡ' : 'Please select both source and destination accounts');
      return;
    }
    if (fromAccountId === toAccountId) {
      Alert.alert(t('error'), isAmharic ? 'መነሻ እና መድረሻ ሒሳቦች መለያየት አለባቸው' : 'Source and destination accounts must be different');
      return;
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      Alert.alert(t('error'), isAmharic ? 'እባክዎ ትክክለኛ የዝውውር መጠን ያስገቡ' : 'Please enter a valid transfer amount');
      return;
    }

    setLoading(true);
    try {
      await accountService.transferFunds({
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        notes: notes.trim(),
        date: new Date(),
      });

      setAmount('');
      setNotes('');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error transferring funds:', error);
      Alert.alert(t('error'), error.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleWrap}>
              <View style={[styles.headerIconCircle, { backgroundColor: '#E3F2FD' }]}>
                <Icon name="swap-horizontal" size={24} color="#1976D2" />
              </View>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFF' : '#222' }, isAmharic && styles.amharicFont]}>
                {t('transfer_funds')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={theme.dark ? '#AAA' : '#666'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            {/* Amount */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
              {isAmharic ? 'የዝውውር መጠን (ብር)' : 'Transfer Amount (ETB)'} *
            </Text>
            <View style={[styles.inputBox, { backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5' }]}>
              <Text style={[styles.currencyPrefix, { color: '#1976D2' }]}>ETB</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.dark ? '#FFF' : '#000' }]}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* From Account */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
              {t('source_account')} *
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {accounts.map((acc) => {
                const isSelected = fromAccountId === acc._id;
                return (
                  <TouchableOpacity
                    key={`from-${acc._id}`}
                    style={[
                      styles.accountPill,
                      {
                        backgroundColor: isSelected
                          ? (theme.dark ? '#0D47A1' : '#E3F2FD')
                          : (theme.dark ? '#2A2A2A' : '#F0F0F0'),
                        borderColor: isSelected ? '#1976D2' : 'transparent',
                      },
                    ]}
                    onPress={() => setFromAccountId(acc._id)}
                  >
                    <Icon name={acc.icon || 'bank'} size={16} color={isSelected ? '#1976D2' : '#888'} />
                    <Text style={[styles.pillText, { color: isSelected ? '#1976D2' : (theme.dark ? '#FFF' : '#333') }]}>
                      {acc.name} ({acc.balance} ETB)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Arrow Divider */}
            <View style={styles.arrowRow}>
              <Icon name="arrow-down" size={24} color="#1976D2" />
            </View>

            {/* To Account */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
              {t('destination_account')} *
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {accounts.map((acc) => {
                const isSelected = toAccountId === acc._id;
                const isSameAsFrom = acc._id === fromAccountId;
                return (
                  <TouchableOpacity
                    key={`to-${acc._id}`}
                    disabled={isSameAsFrom}
                    style={[
                      styles.accountPill,
                      {
                        opacity: isSameAsFrom ? 0.4 : 1,
                        backgroundColor: isSelected
                          ? (theme.dark ? '#1B381E' : '#E8F5E9')
                          : (theme.dark ? '#2A2A2A' : '#F0F0F0'),
                        borderColor: isSelected ? '#2E7D32' : 'transparent',
                      },
                    ]}
                    onPress={() => setToAccountId(acc._id)}
                  >
                    <Icon name={acc.icon || 'bank'} size={16} color={isSelected ? '#2E7D32' : '#888'} />
                    <Text style={[styles.pillText, { color: isSelected ? '#2E7D32' : (theme.dark ? '#FFF' : '#333') }]}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Notes */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555', marginTop: 12 }]}>
              {isAmharic ? 'ማስታወሻ (አማራጭ)' : 'Notes (Optional)'}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                  color: theme.dark ? '#FFF' : '#000',
                },
              ]}
              placeholder={isAmharic ? 'ለምሳሌ፡ ወደ ቴሌብር ማዛወር' : 'e.g. Moved cash to Telebirr'}
              placeholderTextColor="#999"
              value={notes}
              onChangeText={setNotes}
            />
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: '#1976D2' }]}
            onPress={handleTransfer}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>{t('transfer')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
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
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    height: 48,
    fontSize: 20,
    fontWeight: 'bold',
  },
  textInput: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
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
  arrowRow: {
    alignItems: 'center',
    marginVertical: 4,
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
  amharicFont: {
    fontFamily: 'Noto Serif Ethiopic, "material-community", "Material Design Icons", sans-serif',
  },
});

export default TransferModal;
