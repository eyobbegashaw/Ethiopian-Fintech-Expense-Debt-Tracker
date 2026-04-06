import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
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
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../translations';
import CurrencyInput from '../Common/CurrencyInput';
import FriendSelector from '../Common/FriendSelector';
import { groupService } from '../../services/groupService';
import { expenseService } from '../../services/expenseService';

const AddExpenseScreen = ({ route, navigation }) => {
  const { groupId } = route.params;
  const theme = useTheme();
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
  const [date, setDate] = useState(new Date());
  const [category, setCategory] = useState('Other');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [showPayerSelector, setShowPayerSelector] = useState(false);

  const categories = [
    'Food & Drink', 'Transport', 'Rent', 'Utilities',
    'Shopping', 'Entertainment', 'Coffee Ceremony', 'Gift', 'Other'
  ];

  useEffect(() => {
    loadGroup();
  }, []);

  useEffect(() => {
    if (members.length > 0 && !paidBy) {
      const currentUser = members.find(m => m.userId._id === route.params?.currentUserId);
      if (currentUser) {
        setPaidBy(currentUser);
        setSelectedMembers(members.map(m => m.userId));
      }
    }
  }, [members]);

  useEffect(() => {
    calculateSplits();
  }, [amount, splitType, selectedMembers, splits]);

  const loadGroup = async () => {
    try {
      setLoading(true);
      const response = await groupService.getGroup(groupId);
      setGroup(response.data.group);
      setMembers(response.data.group.members);
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    } finally {
      setLoading(false);
    }
  };

  const calculateSplits = () => {
    const numMembers = selectedMembers.length;
    const amountNum = parseFloat(amount) || 0;

    if (splitType === 'equal') {
      const sharePerPerson = amountNum / numMembers;
      const newSplits = {};
      selectedMembers.forEach(member => {
        newSplits[member._id] = sharePerPerson;
      });
      setSplits(newSplits);
    }
  };

  const updateSplitAmount = (memberId, value) => {
    const amountNum = parseFloat(amount) || 0;
    const newSplits = { ...splits, [memberId]: parseFloat(value) || 0 };
    
    // Validate total
    const total = Object.values(newSplits).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - amountNum) > 0.01) {
      // Show warning but don't prevent update
    }
    
    setSplits(newSplits);
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert(i18n.t('error'), i18n.t('expense_description_required'));
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert(i18n.t('error'), i18n.t('expense_amount_required'));
      return;
    }
    
    if (!paidBy) {
      Alert.alert(i18n.t('error'), i18n.t('paid_by_required'));
      return;
    }
    
    if (selectedMembers.length === 0) {
      Alert.alert(i18n.t('error'), i18n.t('split_with_required'));
      return;
    }

    // Prepare splits array
    const splitsArray = selectedMembers.map(member => ({
      userId: member._id,
      share: splits[member._id] || 0,
      percentage: splitType === 'percentage' ? (splits[member._id] / parseFloat(amount) * 100) : undefined,
    }));

    const expenseData = {
      groupId,
      description,
      amount: parseFloat(amount),
      paidBy: paidBy.userId._id,
      date,
      category,
      splits: splitsArray,
      notes,
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
    if (splitType === 'equal') {
      const sharePerPerson = (parseFloat(amount) / selectedMembers.length) || 0;
      return (
        <View style={styles.equalSplitInfo}>
          <Icon name="account-multiple" size={24} color="#2E7D32" />
          <Text style={styles.equalSplitText}>
            {i18n.t('each_pays')}: {sharePerPerson.toFixed(2)} ETB
          </Text>
        </View>
      );
    }

    return selectedMembers.map(member => (
      <View key={member._id} style={styles.splitInput}>
        <Text style={styles.splitMemberName}>
          {member.name}
        </Text>
        <CurrencyInput
          value={splits[member._id]?.toString() || '0'}
          onChange={(value) => updateSplitAmount(member._id, value)}
        />
      </View>
    ));
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
        <FriendSelector
          friends={members.map(m => ({ ...m.userId, _id: m.userId._id }))}
          selectedFriends={selectedMembers}
          onSelect={setSelectedMembers}
          multiSelect={true}
        />
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
        <FriendSelector
          friends={members.map(m => ({ ...m.userId, _id: m.userId._id }))}
          selectedFriends={paidBy}
          onSelect={setPaidBy}
          multiSelect={false}
        />
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TextInput
          label={i18n.t('expense_description')}
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          style={styles.input}
        />

        <CurrencyInput
          value={amount}
          onChange={setAmount}
          placeholder="0.00"
        />

        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowPayerSelector(true)}
        >
          <Text style={styles.selectorLabel}>{i18n.t('paid_by')}</Text>
          <View style={styles.selectorValue}>
            <Text style={styles.selectorText}>
              {paidBy?.userId?.name || i18n.t('select_payer')}
            </Text>
            <Icon name="chevron-down" size={20} color="#666" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.selectorButton}
          onPress={() => setShowMemberSelector(true)}
        >
          <Text style={styles.selectorLabel}>{i18n.t('split_with')}</Text>
          <View style={styles.selectorValue}>
            <Text style={styles.selectorText}>
              {selectedMembers.length} {i18n.t('members')}
            </Text>
            <Icon name="chevron-down" size={20} color="#666" />
          </View>
        </TouchableOpacity>

        <SegmentedButtons
          value={splitType}
          onValueChange={setSplitType}
          buttons={[
            { value: 'equal', label: i18n.t('equal') },
            { value: 'custom', label: i18n.t('custom') },
          ]}
          style={styles.segmentedButton}
        />

        {selectedMembers.length > 0 && renderSplitInputs()}

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
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        <List.Accordion
          title={i18n.t('expense_category')}
          left={props => <Icon {...props} name="tag" size={20} />}
          style={styles.accordion}
        >
          {categories.map(cat => (
            <List.Item
              key={cat}
              title={i18n.t(cat.toLowerCase().replace(/ & /g, '_').replace(/ /g, '_'))}
              onPress={() => setCategory(cat)}
              right={props => category === cat && <Icon {...props} name="check" size={20} />}
            />
          ))}
        </List.Accordion>

        <TextInput
          label={i18n.t('notes')}
          value={notes}
          onChangeText={setNotes}
          mode="outlined"
          multiline
          numberOfLines={3}
          style={styles.input}
        />

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
        >
          {i18n.t('add_expense')}
        </Button>
      </View>

      <MemberSelectorModal />
      <PayerSelectorModal />
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
  segmentedButton: {
    marginBottom: 16,
  },
  splitInput: {
    marginBottom: 12,
  },
  splitMemberName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  equalSplitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    marginBottom: 16,
  },
  equalSplitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 8,
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
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  accordion: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 16,
    paddingVertical: 8,
    backgroundColor: '#2E7D32',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AddExpenseScreen;