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

const ACCOUNT_TYPES = [
  { id: 'cbe', nameEn: 'CBE Bank', nameAm: 'ንግድ ባንክ (CBE)', icon: 'bank', color: '#6A1B9A', institution: 'Commercial Bank of Ethiopia' },
  { id: 'telebirr', nameEn: 'TeleBirr', nameAm: 'ቴሌብር', icon: 'cellphone', color: '#00838F', institution: 'Ethio Telecom' },
  { id: 'cbe_birr', nameEn: 'CBE Birr', nameAm: 'ሲቢኢ ብር', icon: 'wallet', color: '#8E24AA', institution: 'Commercial Bank of Ethiopia' },
  { id: 'amole', nameEn: 'Amole', nameAm: 'አሞሌ (ዳሽን)', icon: 'credit-card', color: '#00695C', institution: 'Dashen Bank' },
  { id: 'cash', nameEn: 'Cash in Hand', nameAm: 'የእጅ ገንዘብ (ጥሬ)', icon: 'cash', color: '#2E7D32', institution: 'Cash' },
  { id: 'bank', nameEn: 'Other Bank', nameAm: 'ሌላ የኢትዮጵያ ባንክ', icon: 'bank-outline', color: '#1565C0', institution: 'Commercial Bank' },
  { id: 'international', nameEn: 'International', nameAm: 'ዓለም አቀፍ ባንክ', icon: 'earth', color: '#37474F', institution: 'International Bank' },
  { id: 'custom', nameEn: 'Custom Account', nameAm: 'ብጁ ሒሳብ', icon: 'safe', color: '#E65100', institution: 'Custom' },
];

const AddAccountModal = ({ visible, onClose, onSuccess }) => {
  const theme = useTheme();
  const { t, isAmharic } = useLanguage();

  const [name, setName] = useState('');
  const [selectedType, setSelectedType] = useState('cbe');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [currency, setCurrency] = useState('ETB');
  const [isDefault, setIsDefault] = useState(false);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectType = (item) => {
    setSelectedType(item.id);
    if (!name) {
      setName(isAmharic ? item.nameAm : item.nameEn);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert(t('error'), isAmharic ? 'እባክዎ የሒሳብ ስም ያስገቡ' : 'Please enter an account name');
      return;
    }

    const typeObj = ACCOUNT_TYPES.find((t) => t.id === selectedType);

    setLoading(true);
    try {
      await accountService.createAccount({
        name: name.trim(),
        type: selectedType,
        institution: typeObj?.institution || 'Bank',
        accountNumber: accountNumber.trim(),
        initialBalance: initialBalance ? Number(initialBalance) : 0,
        currency,
        color: typeObj?.color || '#2E7D32',
        icon: typeObj?.icon || 'bank',
        isDefault,
        notes: notes.trim(),
      });

      setName('');
      setAccountNumber('');
      setInitialBalance('');
      setIsDefault(false);
      setNotes('');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating account:', error);
      Alert.alert(t('error'), error.response?.data?.message || 'Failed to add account');
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
                <Icon name="bank-plus" size={24} color="#2E7D32" />
              </View>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFF' : '#222' }, isAmharic && styles.amharicFont]}>
                {t('add_account')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={theme.dark ? '#AAA' : '#666'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Account Type Grid */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
              {t('account_type')} *
            </Text>
            <View style={styles.typeGrid}>
              {ACCOUNT_TYPES.map((type) => {
                const isSelected = selectedType === type.id;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeCard,
                      {
                        backgroundColor: isSelected
                          ? (theme.dark ? '#1B381E' : '#E8F5E9')
                          : (theme.dark ? '#2A2A2A' : '#F9F9F9'),
                        borderColor: isSelected ? theme.colors.primary : (theme.dark ? '#333' : '#E0E0E0'),
                      },
                    ]}
                    onPress={() => handleSelectType(type)}
                  >
                    <Icon name={type.icon} size={22} color={type.color} />
                    <Text
                      style={[
                        styles.typeLabel,
                        { color: isSelected ? theme.colors.primary : (theme.dark ? '#DDD' : '#444') },
                        isAmharic && styles.amharicFont,
                      ]}
                      numberOfLines={1}
                    >
                      {isAmharic ? type.nameAm : type.nameEn}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Account Name */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555', marginTop: 12 }]}>
              {t('account_name')} *
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                  color: theme.dark ? '#FFF' : '#000',
                },
              ]}
              placeholder={isAmharic ? 'ለምሳሌ፡ የንግድ ባንክ ቁጠባ፣ ቴሌብር' : 'e.g. CBE Savings, TeleBirr'}
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
            />

            {/* Account Number */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
              {t('account_number')} (አማራጭ)
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                  color: theme.dark ? '#FFF' : '#000',
                },
              ]}
              placeholder={isAmharic ? 'የሂሳብ ቁጥር (ለምሳሌ፡ 1000...)' : 'Account number or phone'}
              placeholderTextColor="#999"
              value={accountNumber}
              onChangeText={setAccountNumber}
            />

            {/* Initial Balance */}
            <Text style={[styles.fieldLabel, { color: theme.dark ? '#CCC' : '#555' }]}>
              {t('initial_balance')} (ETB)
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.dark ? '#2A2A2A' : '#F5F5F5',
                  color: theme.dark ? '#FFF' : '#000',
                },
              ]}
              placeholder="0.00"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={initialBalance}
              onChangeText={setInitialBalance}
            />

            {/* Default Account Checkbox */}
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIsDefault(!isDefault)}
            >
              <Icon
                name={isDefault ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={22}
                color={theme.colors.primary}
              />
              <Text style={[styles.checkboxLabel, { color: theme.dark ? '#FFF' : '#333' }]}>
                {isAmharic ? 'ዋነኛ መደበኛ ሒሳብ ይሁን' : 'Set as primary default account'}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
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
    maxHeight: '92%',
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  typeCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  textInput: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 14,
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

export default AddAccountModal;
