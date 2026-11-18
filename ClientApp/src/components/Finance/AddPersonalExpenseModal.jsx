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

const EXPENSE_CATEGORIES = [
  { id: 'Food & Dining', nameEn: 'Food & Dining', nameAm: 'ምግብ እና መጠጥ', icon: 'silverware-fork-knife' },
  { id: 'Groceries', nameEn: 'Groceries', nameAm: 'ግሮሰሪ / ሸቀጥ', icon: 'cart' },
  { id: 'Transportation', nameEn: 'Transportation', nameAm: 'ትራንስፖርት / ታክሲ', icon: 'taxi' },
  { id: 'Housing & Rent', nameEn: 'Housing & Rent', nameAm: 'ቤት ኪራይ', icon: 'home' },
  { id: 'Utilities', nameEn: 'Utilities / Bills', nameAm: 'መብራት / ውሃ / ኢንተርኔት', icon: 'flash' },
  { id: 'Health & Medical', nameEn: 'Health & Medical', nameAm: 'ጤና እና ሕክምና', icon: 'medical-bag' },
  { id: 'Entertainment', nameEn: 'Entertainment', nameAm: 'መዝናኛ', icon: 'movie' },
  { id: 'Education', nameEn: 'Education', nameAm: 'ትምህርት', icon: 'school' },
  { id: 'Shopping', nameEn: 'Shopping', nameAm: 'ግዢ / አልባሳት', icon: 'shopping' },
  { id: 'Family & Personal', nameEn: 'Family & Personal', nameAm: 'ቤተሰብ እና የግል', icon: 'account-child' },
  { id: 'Debt Payment', nameEn: 'Debt Payment', nameAm: 'የዕዳ ክፍያ', icon: 'hand-coin' },
  { id: 'Other Expense', nameEn: 'Other Expense', nameAm: 'ሌላ ወጪ', icon: 'dots-horizontal' },
];

const AddPersonalExpenseModal = ({ visible, onClose, onSuccess, accounts = [] }) => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Food & Dining');
  const [selectedAccountId, setSelectedAccountId] = useState(
    accounts.find((a) => a.isDefault)?._id || (accounts[0]?._id ?? '')
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      Alert.alert(t('error'), isAmharic ? 'እባክዎ ትክክለኛ የወጪ መጠን ያስገቡ' : 'Please enter a valid expense amount');
      return;
    }
    if (!description.trim()) {
      Alert.alert(t('error'), isAmharic ? 'እባክዎ መግለጫ ያስገቡ' : 'Please enter a description');
      return;
    }
    if (!selectedAccountId) {
      Alert.alert(t('error'), isAmharic ? 'እባክዎ ከየትኛው ሒሳብ እንደተከፈለ ይምረጡ' : 'Please select payment account');
      return;
    }

    setLoading(true);
    try {
      await financeService.createTransaction({
        type: 'expense',
        accountId: selectedAccountId,
        amount: Number(amount),
        category: selectedCategory,
        description: description.trim(),
        counterparty: counterparty.trim(),
        date: new Date(),
        source: 'manual',
      });

      setAmount('');
      setDescription('');
      setCounterparty('');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error adding personal expense:', error);
      Alert.alert(t('error'), error.response?.data?.message || 'Failed to record expense');
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
              <View style={[styles.headerIconCircle, { backgroundColor: '#FFEBEE' }]}>
                <Icon name="arrow-up-bold-circle" size={24} color="#D32F2F" />
              </View>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFF' : '#222' }, isAmharic && styles.amharicFont]}>
                {t('add_personal_expense')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={24} color={theme.dark ? '#AAA' : '#666'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Amount Input */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
              {isAmharic ? 'የወጪ መጠን (ብር)' : 'Amount (ETB)'} *
            </Text>
            <View style={[styles.inputBox, { backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5' }]}>
              <Text style={[styles.currencyPrefix, { color: '#D32F2F' }]}>ETB</Text>
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
              placeholder={isAmharic ? 'ለምሳሌ፡ የምሳ ክፍያ፣ የታክሲ' : 'e.g. Lunch with friends, taxi'}
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
            />

            {/* Merchant / Recipient */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
              {isAmharic ? 'የነጋዴ ወይም የተቀባይ ስም (አማራጭ)' : 'Merchant / Recipient (Optional)'}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                  color: theme.dark ? '#FFF' : '#000',
                },
              ]}
              placeholder={isAmharic ? 'ለምሳሌ፡ ካፌ፣ ሱፐርማርኬት' : 'e.g. Total, Supermarket'}
              placeholderTextColor="#999"
              value={counterparty}
              onChangeText={setCounterparty}
            />

            {/* Payment Account */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
              {t('source_account')} *
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
                          ? (theme.dark ? '#3E2723' : '#FFEBEE')
                          : (theme.dark ? '#2A2A2A' : '#F0F0F0'),
                        borderColor: isSelected ? '#D32F2F' : 'transparent',
                      },
                    ]}
                    onPress={() => setSelectedAccountId(acc._id)}
                  >
                    <Icon name={acc.icon || 'bank'} size={16} color={isSelected ? '#D32F2F' : '#888'} />
                    <Text style={[styles.pillText, { color: isSelected ? '#D32F2F' : (theme.dark ? '#FFF' : '#333') }]}>
                      {acc.name} ({acc.balance} ETB)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Category Selector */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555', marginTop: 14 }]}>
              {isAmharic ? 'የወጪ ምድብ' : 'Expense Category'}
            </Text>
            <View style={styles.categoryGrid}>
              {EXPENSE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: isSelected
                          ? (theme.dark ? '#332020' : '#FFEBEE')
                          : (theme.dark ? '#2A2A2A' : '#F9F9F9'),
                        borderColor: isSelected ? '#D32F2F' : (theme.dark ? '#333' : '#E0E0E0'),
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Icon name={cat.icon} size={20} color={isSelected ? '#D32F2F' : '#777'} />
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: isSelected ? '#D32F2F' : (theme.dark ? '#DDD' : '#444') },
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
            style={[styles.submitButton, { backgroundColor: '#D32F2F' }]}
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

export default AddPersonalExpenseModal;
