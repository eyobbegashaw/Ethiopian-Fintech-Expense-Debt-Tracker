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
import { financeService } from '../../services/financeService';

const INCOME_CATEGORIES = [
  { id: 'Salary', nameEn: 'Salary', nameAm: 'ደመወዝ', icon: 'cash-multiple' },
  { id: 'Business', nameEn: 'Business', nameAm: 'ንግድ', icon: 'store' },
  { id: 'Freelance', nameEn: 'Freelance', nameAm: 'ተጨማሪ ሥራ', icon: 'laptop' },
  { id: 'Investment', nameEn: 'Investment', nameAm: 'ኢንቨስትመንት', icon: 'trending-up' },
  { id: 'Rental', nameEn: 'Rental', nameAm: 'የኪራይ ገቢ', icon: 'home-city' },
  { id: 'Gift', nameEn: 'Gift', nameAm: 'ስጦታ', icon: 'gift' },
  { id: 'Group Payout', nameEn: 'Equb / Payout', nameAm: 'የእቁብ ድልድል', icon: 'hand-coin' },
  { id: 'Other Income', nameEn: 'Other Income', nameAm: 'ሌላ ገቢ', icon: 'plus-circle' },
];

const AddIncomeModal = ({ visible, onClose, onSuccess, accounts = [] }) => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Salary');
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts.find((a) => a.isDefault)?._id || (accounts[0]?._id ?? '')
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      Alert.alert(t('error'), isAmharic ? 'እባክዎ ትክክለኛ የገንዘብ መጠን ያስገቡ' : 'Please enter a valid amount');
      return;
    }
    if (!description.trim()) {
      Alert.alert(t('error'), isAmharic ? 'እባክዎ መግለጫ ያስገቡ' : 'Please enter a description');
      return;
    }
    if (!selectedAccountId) {
      Alert.alert(t('error'), isAmharic ? 'እባክዎ ተቀባይ ሒሳብ ይምረጡ' : 'Please select receiving account');
      return;
    }

    setLoading(true);
    try {
      await financeService.createTransaction({
        type: 'income',
        accountId: selectedAccountId,
        amount: Number(amount),
        category: selectedCategory,
        description: description.trim(),
        counterparty: counterparty.trim(),
        date: new Date(),
        source: selectedCategory === 'Group Payout' ? 'equb' : 'manual',
      });

      setAmount('');
      setDescription('');
      setCounterparty('');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error adding income:', error);
      Alert.alert(t('error'), error.response?.data?.message || 'Failed to record income');
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
              <View style={[styles.headerIconCircle, { backgroundColor: '#E8F5E9' }]}>
                <Icon name="arrow-down-bold-circle" size={24} color="#2E7D32" />
              </View>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFF' : '#222' }, isAmharic && styles.amharicFont]}>
                {t('add_income')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={24} color={theme.dark ? '#AAA' : '#666'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Amount Input */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
              {isAmharic ? 'መጠን (ብር)' : 'Amount (ETB)'} *
            </Text>
            <View style={[styles.inputBox, { backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5' }]}>
              <Text style={[styles.currencyPrefix, { color: theme.colors.primary }]}>ETB</Text>
              <TextInput
                style={[styles.amountInput, { color: theme.dark ? '#FFF' : '#000' }]}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* Description */}
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
              placeholder={isAmharic ? 'ለምሳሌ፡ የወር ደመወዝ' : 'e.g. Monthly Salary'}
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
            />

            {/* Payer / Counterparty */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
              {isAmharic ? 'ከማን የተገኘ (አማራጭ)' : 'Received From (Optional)'}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                  color: theme.dark ? '#FFF' : '#000',
                },
              ]}
              placeholder={isAmharic ? 'የአሰሪ ወይም የላኪ ስም' : 'Employer or Sender name'}
              placeholderTextColor="#999"
              value={counterparty}
              onChangeText={setCounterparty}
            />

            {/* Account Selector */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
              {t('destination_account')} *
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {accounts.map((acc) => {
                const isSelected = selectedAccountId === acc._id;
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
                    onPress={() => setSelectedAccountId(acc._id)}
                  >
                    <Icon name={acc.icon || 'bank'} size={16} color={isSelected ? theme.colors.primary : '#888'} />
                    <Text style={[styles.pillText, { color: isSelected ? theme.colors.primary : (theme.dark ? '#FFF' : '#333') }]}>
                      {acc.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Category Selector */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555', marginTop: 14 }]}>
              {isAmharic ? 'የገቢ ምድብ' : 'Income Category'}
            </Text>
            <View style={styles.categoryGrid}>
              {INCOME_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: isSelected
                          ? (theme.dark ? '#1B381E' : '#E8F5E9')
                          : (theme.dark ? '#2A2A2A' : '#F9F9F9'),
                        borderColor: isSelected ? '#2E7D32' : (theme.dark ? '#333' : '#E0E0E0'),
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Icon name={cat.icon} size={20} color={isSelected ? '#2E7D32' : '#777'} />
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: isSelected ? '#2E7D32' : (theme.dark ? '#DDD' : '#444') },
                        isAmharic && styles.amharicFont,
                      ]}
                      numberOfLines={1}
                    >
                      {isAmharic ? cat.nameAm : cat.nameEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: '#2E7D32' }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>{t('save')}</Text>
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
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
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

export default AddIncomeModal;
