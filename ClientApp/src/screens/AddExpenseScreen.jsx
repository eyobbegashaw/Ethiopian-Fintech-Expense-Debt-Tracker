import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  SegmentedButtons,
  List,
  Modal,
  Portal,
  useTheme,
  ActivityIndicator,
  Avatar,
  Chip,
  Divider,
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../translations';
import CurrencyInput from '../components/Common/CurrencyInput';
import { groupService } from '../services/groupService';
import { expenseService } from '../services/expenseService';
import { useAuth } from '../contexts/AuthContext';

const AddExpenseScreen = ({ route, navigation }) => {
  const { groupId } = route.params;
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  
  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(null);
  const [splitType, setSplitType] = useState('equal');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [splits, setSplits] = useState({});
  const [percentages, setPercentages] = useState({});
  const [date, setDate] = useState(new Date());
  const [category, setCategory] = useState('Other');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [showPayerSelector, setShowPayerSelector] = useState(false);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [splitTotalValid, setSplitTotalValid] = useState(true);

  const categories = [
    { value: 'Food & Drink', icon: 'food', label: 'food_drink' },
    { value: 'Transport', icon: 'car', label: 'transport' },
    { value: 'Rent', icon: 'home', label: 'rent' },
    { value: 'Utilities', icon: 'flash', label: 'utilities' },
    { value: 'Shopping', icon: 'cart', label: 'shopping' },
    { value: 'Entertainment', icon: 'movie', label: 'entertainment' },
    { value: 'Coffee Ceremony', icon: 'coffee', label: 'coffee_ceremony' },
    { value: 'Gift', icon: 'gift', label: 'gift' },
    { value: 'Other', icon: 'dots-horizontal', label: 'other' },
  ];

  useEffect(() => {
    loadGroup();
  }, []);

  useEffect(() => {
    if (members.length > 0 && !paidBy) {
      const currentUser = members.find(m => m.userId._id === user._id);
      if (currentUser) {
        setPaidBy(currentUser);
      }
    }
  }, [members]);

  useEffect(() => {
    if (members.length > 0 && selectedMembers.length === 0) {
      setSelectedMembers(members.map(m => m.userId));
    }
  }, [members]);

  useEffect(() => {
    calculateSplits();
  }, [amount, splitType, selectedMembers, splits, percentages]);

  const loadGroup = async () => {
    try {
      setLoading(true);
      const response = await groupService.getGroup(groupId);
      setGroup(response.data.group);
      setMembers(response.data.group.members);
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const calculateSplits = () => {
    const amountNum = parseFloat(amount) || 0;
    const numMembers = selectedMembers.length;

    if (splitType === 'equal' && numMembers > 0) {
      const sharePerPerson = amountNum / numMembers;
      const newSplits = {};
      selectedMembers.forEach(member => {
        newSplits[member._id] = sharePerPerson;
      });
      setSplits(newSplits);
      setSplitTotalValid(true);
    } 
    else if (splitType === 'percentage' && numMembers > 0) {
      const newPercentages = { ...percentages };
      if (Object.keys(newPercentages).length === 0) {
        const equalPercent = 100 / numMembers;
        selectedMembers.forEach(member => {
          newPercentages[member._id] = equalPercent;
        });
        setPercentages(newPercentages);
      }
      
      const newSplits = {};
      let total = 0;
      selectedMembers.forEach(member => {
        const percent = newPercentages[member._id] || 0;
        const share = (percent / 100) * amountNum;
        newSplits[member._id] = share;
        total += share;
      });
      setSplits(newSplits);
      setSplitTotalValid(Math.abs(total - amountNum) < 0.01);
    }
  };

  const updateCustomSplit = (memberId, value) => {
    const amountNum = parseFloat(amount) || 0;
    const newSplits = { ...splits, [memberId]: parseFloat(value) || 0 };
    setSplits(newSplits);
    
    const total = Object.values(newSplits).reduce((sum, val) => sum + val, 0);
    const isValid = Math.abs(total - amountNum) < 0.01;
    setSplitTotalValid(isValid);
  };

  const updatePercentage = (memberId, value) => {
    const amountNum = parseFloat(amount) || 0;
    const percentValue = parseFloat(value) || 0;
    const newPercentages = { ...percentages, [memberId]: percentValue };
    setPercentages(newPercentages);
    
    const totalPercent = Object.values(newPercentages).reduce((sum, val) => sum + val, 0);
    const isValid = Math.abs(totalPercent - 100) < 0.01;
    
    if (isValid) {
      const newSplits = {};
      selectedMembers.forEach(member => {
        const percent = newPercentages[member._id] || 0;
        newSplits[member._id] = (percent / 100) * amountNum;
      });
      setSplits(newSplits);
    }
    setSplitTotalValid(isValid);
  };

  const validateForm = () => {
    if (!description.trim()) {
      Alert.alert(i18n.t('error'), i18n.t('expense_description_required'));
      return false;
    }
    
    const amountNum = parseFloat(amount);
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert(i18n.t('error'), i18n.t('expense_amount_required'));
      return false;
    }
    
    if (!paidBy) {
      Alert.alert(i18n.t('error'), i18n.t('paid_by_required'));
      return false;
    }
    
    if (selectedMembers.length === 0) {
      Alert.alert(i18n.t('error'), i18n.t('split_with_required'));
      return false;
    }
    
    if (!splitTotalValid) {
      Alert.alert(i18n.t('error'), i18n.t('split_total_mismatch'));
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Prepare splits array
    const splitsArray = selectedMembers.map(member => ({
      userId: member._id,
      share: splits[member._id] || 0,
      percentage: splitType === 'percentage' ? percentages[member._id] : undefined,
    }));

    const expenseData = {
      groupId,
      description: description.trim(),
      amount: parseFloat(amount),
      paidBy: paidBy.userId._id,
      date: date.toISOString(),
      category,
      splits: splitsArray,
      notes: notes.trim() || undefined,
    };

    try {
      setLoading(true);
      await expenseService.addExpense(expenseData);
      Alert.alert(i18n.t('success'), i18n.t('expense_added_success'));
      navigation.goBack();
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    } finally {
      setLoading(false);
    }
  };

  const renderSplitInputs = () => {
    const amountNum = parseFloat(amount) || 0;
    
    if (splitType === 'equal') {
      const sharePerPerson = selectedMembers.length > 0 ? amountNum / selectedMembers.length : 0;
      return (
        <View style={styles.equalSplitContainer}>
          <View style={styles.equalSplitCard}>
            <Icon name="account-multiple" size={32} color="#2E7D32" />
            <View style={styles.equalSplitTextContainer}>
              <Text style={styles.equalSplitLabel}>{i18n.t('each_pays')}</Text>
              <Text style={styles.equalSplitAmount}>{sharePerPerson.toFixed(2)} ETB</Text>
            </View>
          </View>
          <Text style={styles.equalSplitNote}>
            {i18n.t('equal_split_note')}
          </Text>
        </View>
      );
    }

    return selectedMembers.map(member => {
      const isPercentage = splitType === 'percentage';
      const value = isPercentage 
        ? (percentages[member._id] || 0).toString()
        : (splits[member._id] || 0).toString();
      
      return (
        <View key={member._id} style={styles.splitInputRow}>
          <View style={styles.splitMemberInfo}>
            <Avatar.Text
              size={40}
              label={member.name.charAt(0)}
              style={[styles.splitAvatar, { backgroundColor: theme.colors.primary }]}
            />
            <View>
              <Text style={styles.splitMemberName}>{member.name}</Text>
              {member.nickname && (
                <Text style={styles.splitMemberNickname}>@{member.nickname}</Text>
              )}
            </View>
          </View>
          
          <View style={styles.splitInputWrapper}>
            {isPercentage ? (
              <View style={styles.percentageWrapper}>
                <TextInput
                  style={styles.percentageInput}
                  value={value}
                  onChangeText={(text) => updatePercentage(member._id, text)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#999"
                />
                <Text style={styles.percentageSymbol}>%</Text>
              </View>
            ) : (
              <CurrencyInput
                value={value}
                onChange={(val) => updateCustomSplit(member._id, val)}
                containerStyle={styles.customCurrencyContainer}
              />
            )}
            
            {!isPercentage && amountNum > 0 && (
              <Text style={styles.splitPercentage}>
                ({((splits[member._id] || 0) / amountNum * 100).toFixed(1)}%)
              </Text>
            )}
          </View>
        </View>
      );
    });
  };

  const MemberSelectorModal = () => (
    <Portal>
      <Modal
        visible={showMemberSelector}
        onDismiss={() => setShowMemberSelector(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{i18n.t('split_with')}</Text>
          <Button onPress={() => setShowMemberSelector(false)}>
            {i18n.t('done')}
          </Button>
        </View>
        <ScrollView>
          {members.map(member => {
            const isSelected = selectedMembers.some(m => m._id === member.userId._id);
            return (
              <TouchableOpacity
                key={member.userId._id}
                style={styles.memberSelectItem}
                onPress={() => {
                  if (isSelected) {
                    setSelectedMembers(selectedMembers.filter(m => m._id !== member.userId._id));
                  } else {
                    setSelectedMembers([...selectedMembers, member.userId]);
                  }
                }}
              >
                <View style={styles.memberSelectInfo}>
                  <Avatar.Text
                    size={40}
                    label={member.userId.name.charAt(0)}
                    style={[styles.memberSelectAvatar, { backgroundColor: theme.colors.primary }]}
                  />
                  <View>
                    <Text style={styles.memberSelectName}>
                      {member.nickname || member.userId.name}
                    </Text>
                    {member.nickname && (
                      <Text style={styles.memberSelectRealName}>{member.userId.name}</Text>
                    )}
                  </View>
                </View>
                <Icon
                  name={isSelected ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={24}
                  color={isSelected ? theme.colors.primary : '#ccc'}
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Modal>
    </Portal>
  );

  const PayerSelectorModal = () => (
    <Portal>
      <Modal
        visible={showPayerSelector}
        onDismiss={() => setShowPayerSelector(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{i18n.t('paid_by')}</Text>
          <Button onPress={() => setShowPayerSelector(false)}>
            {i18n.t('done')}
          </Button>
        </View>
        {members.map(member => (
          <TouchableOpacity
            key={member.userId._id}
            style={styles.payerSelectItem}
            onPress={() => {
              setPaidBy(member);
              setShowPayerSelector(false);
            }}
          >
            <View style={styles.payerSelectInfo}>
              <Avatar.Text
                size={50}
                label={member.userId.name.charAt(0)}
                style={[styles.payerSelectAvatar, { backgroundColor: theme.colors.primary }]}
              />
              <View>
                <Text style={styles.payerSelectName}>
                  {member.nickname || member.userId.name}
                </Text>
                {member.nickname && (
                  <Text style={styles.payerSelectRealName}>{member.userId.name}</Text>
                )}
                {member.userId._id === user._id && (
                  <Chip icon="account" size="small" style={styles.youChip}>
                    {i18n.t('you')}
                  </Chip>
                )}
              </View>
            </View>
            {paidBy?.userId._id === member.userId._id && (
              <Icon name="check-circle" size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </Modal>
    </Portal>
  );

  const CategorySelectorModal = () => (
    <Portal>
      <Modal
        visible={showCategorySelector}
        onDismiss={() => setShowCategorySelector(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{i18n.t('expense_category')}</Text>
          <Button onPress={() => setShowCategorySelector(false)}>
            {i18n.t('done')}
          </Button>
        </View>
        <View style={styles.categoryGrid}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryItem,
                category === cat.value && styles.categoryItemActive,
              ]}
              onPress={() => {
                setCategory(cat.value);
                setShowCategorySelector(false);
              }}
            >
              <View
                style={[
                  styles.categoryIconContainer,
                  category === cat.value && styles.categoryIconContainerActive,
                ]}
              >
                <Icon
                  name={cat.icon}
                  size={24}
                  color={category === cat.value ? '#fff' : '#666'}
                />
              </View>
              <Text
                style={[
                  styles.categoryLabel,
                  category === cat.value && styles.categoryLabelActive,
                ]}
              >
                {i18n.t(cat.label)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </Portal>
  );

  if (loading && !group) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const totalSplit = Object.values(splits).reduce((sum, val) => sum + val, 0);
  const amountNum = parseFloat(amount) || 0;
  const remainingAmount = amountNum - totalSplit;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Description Input */}
        <TextInput
          label={i18n.t('expense_description')}
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          style={styles.input}
          placeholder={i18n.t('what_was_it_for')}
          left={<TextInput.Icon icon="receipt" />}
        />

        {/* Amount Input */}
        <CurrencyInput
          value={amount}
          onChange={setAmount}
          placeholder="0.00"
        />

        {/* Paid By Selector */}
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowPayerSelector(true)}
        >
          <Text style={styles.selectorLabel}>{i18n.t('paid_by')}</Text>
          <View style={styles.selectorValue}>
            <View style={styles.paidByInfo}>
              <Avatar.Text
                size={30}
                label={paidBy?.userId?.name?.charAt(0) || '?'}
                style={styles.paidByAvatar}
              />
              <Text style={styles.selectorText}>
                {paidBy?.nickname || paidBy?.userId?.name || i18n.t('select_payer')}
              </Text>
            </View>
            <Icon name="chevron-down" size={20} color="#666" />
          </View>
        </TouchableOpacity>

        {/* Split With Selector */}
        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowMemberSelector(true)}
        >
          <Text style={styles.selectorLabel}>{i18n.t('split_with')}</Text>
          <View style={styles.selectorValue}>
            <Text style={styles.selectorText}>
              {selectedMembers.length} {i18n.t('people')}
            </Text>
            <Icon name="chevron-down" size={20} color="#666" />
          </View>
        </TouchableOpacity>

        {/* Split Type Selection */}
        <View style={styles.splitTypeContainer}>
          <Text style={styles.splitTypeLabel}>{i18n.t('split_method')}</Text>
          <SegmentedButtons
            value={splitType}
            onValueChange={setSplitType}
            buttons={[
              { value: 'equal', label: i18n.t('equal'), icon: 'account-multiple' },
              { value: 'percentage', label: i18n.t('percentage'), icon: 'percent' },
              { value: 'custom', label: i18n.t('custom'), icon: 'pencil' },
            ]}
            style={styles.segmentedButton}
          />
        </View>

        {/* Split Inputs */}
        {selectedMembers.length > 0 && (
          <View style={styles.splitsContainer}>
            <Text style={styles.splitsTitle}>{i18n.t('split_details')}</Text>
            {renderSplitInputs()}
            
            {/* Total Validation */}
            {splitType !== 'equal' && (
              <View style={[
                styles.totalValidation,
                splitTotalValid ? styles.totalValid : styles.totalInvalid,
              ]}>
                <Icon
                  name={splitTotalValid ? 'check-circle' : 'alert-circle'}
                  size={20}
                  color={splitTotalValid ? '#4CAF50' : '#F44336'}
                />
                <Text style={[
                  styles.totalValidationText,
                  splitTotalValid ? styles.totalValidText : styles.totalInvalidText,
                ]}>
                  {splitTotalValid 
                    ? `${i18n.t('total')}: ${totalSplit.toFixed(2)} / ${amountNum.toFixed(2)} ETB`
                    : `${i18n.t('split_total_mismatch')}: ${totalSplit.toFixed(2)} / ${amountNum.toFixed(2)} ETB`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Date Picker */}
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon name="calendar" size={20} color="#666" />
          <Text style={styles.dateText}>
            {date.toLocaleDateString()}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        {/* Category Selector */}
        <TouchableOpacity
          style={styles.categoryButton}
          onPress={() => setShowCategorySelector(true)}
        >
          <Icon name="tag" size={20} color="#666" />
          <Text style={styles.categoryText}>
            {i18n.t(categories.find(c => c.value === category)?.label || 'other')}
          </Text>
          <Icon name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>

        {/* Notes Input */}
        <TextInput
          label={i18n.t('notes_optional')}
          value={notes}
          onChangeText={setNotes}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.notesInput}
          placeholder={i18n.t('add_notes')}
        />

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
          contentStyle={styles.submitButtonContent}
          icon="check"
        >
          {i18n.t('add_expense')}
        </Button>
      </View>

      <MemberSelectorModal />
      <PayerSelectorModal />
      <CategorySelectorModal />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
    paddingBottom: 40,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  selectorButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectorLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  selectorValue: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
  },
  paidByInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paidByAvatar: {
    backgroundColor: '#2E7D32',
  },
  splitTypeContainer: {
    marginBottom: 16,
  },
  splitTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  segmentedButton: {
    backgroundColor: '#fff',
  },
  splitsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  splitsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  splitInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  splitMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  splitAvatar: {
    backgroundColor: '#2E7D32',
  },
  splitMemberName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  splitMemberNickname: {
    fontSize: 11,
    color: '#999',
  },
  splitInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customCurrencyContainer: {
    width: 120,
  },
  percentageWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  percentageInput: {
    width: 60,
    height: 40,
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  percentageSymbol: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  splitPercentage: {
    fontSize: 12,
    color: '#999',
    minWidth: 50,
  },
  equalSplitContainer: {
    marginBottom: 16,
  },
  equalSplitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  equalSplitTextContainer: {
    flex: 1,
  },
  equalSplitLabel: {
    fontSize: 12,
    color: '#666',
  },
  equalSplitAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  equalSplitNote: {
    fontSize: 11,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  totalValidation: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  totalValid: {
    backgroundColor: '#E8F5E9',
  },
  totalInvalid: {
    backgroundColor: '#FFEBEE',
  },
  totalValidationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  totalValidText: {
    color: '#2E7D32',
  },
  totalInvalidText: {
    color: '#F44336',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 8,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 8,
  },
  categoryText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  notesInput: {
    marginBottom: 24,
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  modalContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  memberSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberSelectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberSelectAvatar: {
    backgroundColor: '#2E7D32',
  },
  memberSelectName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  memberSelectRealName: {
    fontSize: 12,
    color: '#999',
  },
  payerSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  payerSelectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  payerSelectAvatar: {
    backgroundColor: '#2E7D32',
  },
  payerSelectName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  payerSelectRealName: {
    fontSize: 12,
    color: '#999',
  },
  youChip: {
    marginTop: 4,
    height: 20,
    backgroundColor: '#E3F2FD',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  categoryItem: {
    width: '33.33%',
    alignItems: 'center',
    padding: 12,
  },
  categoryItemActive: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIconContainerActive: {
    backgroundColor: '#2E7D32',
  },
  categoryLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AddExpenseScreen;