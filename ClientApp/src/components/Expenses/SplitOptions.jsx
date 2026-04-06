import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { RadioButton, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../translations';
import CurrencyInput from '../Common/CurrencyInput';
import Avatar from '../Common/Avatar';

const SplitOptions = ({ members, totalAmount, onSplitChange, initialSplitType = 'equal' }) => {
  const theme = useTheme();
  const [splitType, setSplitType] = useState(initialSplitType);
  const [customSplits, setCustomSplits] = useState({});
  const [percentages, setPercentages] = useState({});

  const calculateEqualSplit = () => {
    const sharePerPerson = totalAmount / members.length;
    const splits = {};
    members.forEach(member => {
      splits[member._id] = sharePerPerson;
    });
    return splits;
  };

  const handleSplitTypeChange = (type) => {
    setSplitType(type);
    let splits = {};
    
    if (type === 'equal') {
      splits = calculateEqualSplit();
      onSplitChange(splits, type);
    } else if (type === 'percentage') {
      const equalPercent = 100 / members.length;
      const newPercentages = {};
      members.forEach(member => {
        newPercentages[member._id] = equalPercent;
      });
      setPercentages(newPercentages);
      splits = calculatePercentageSplits(newPercentages);
      onSplitChange(splits, type, newPercentages);
    } else {
      const equalSplit = calculateEqualSplit();
      setCustomSplits(equalSplit);
      onSplitChange(equalSplit, type);
    }
  };

  const calculatePercentageSplits = (percentValues) => {
    const splits = {};
    members.forEach(member => {
      splits[member._id] = (percentValues[member._id] / 100) * totalAmount;
    });
    return splits;
  };

  const updateCustomSplit = (memberId, amount) => {
    const newSplits = { ...customSplits, [memberId]: parseFloat(amount) || 0 };
    setCustomSplits(newSplits);
    
    // Validate total
    const total = Object.values(newSplits).reduce((sum, val) => sum + val, 0);
    const isValid = Math.abs(total - totalAmount) < 0.01;
    
    onSplitChange(newSplits, splitType, null, isValid);
  };

  const updatePercentage = (memberId, percentage) => {
    const newPercentages = { ...percentages, [memberId]: parseFloat(percentage) || 0 };
    setPercentages(newPercentages);
    
    // Normalize to 100%
    const total = Object.values(newPercentages).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 100) > 0.01) {
      // Show warning but don't prevent update
    }
    
    const splits = calculatePercentageSplits(newPercentages);
    onSplitChange(splits, splitType, newPercentages);
  };

  const renderSplitInputs = () => {
    if (splitType === 'equal') {
      const sharePerPerson = totalAmount / members.length;
      return (
        <View style={styles.equalSplitContainer}>
          <Icon name="account-multiple" size={32} color="#2E7D32" />
          <Text style={styles.equalSplitText}>
            {i18n.t('each_pays')}: {sharePerPerson.toFixed(2)} ETB
          </Text>
        </View>
      );
    }

    if (splitType === 'percentage') {
      return members.map(member => (
        <View key={member._id} style={styles.splitInputRow}>
          <View style={styles.memberInfo}>
            <Avatar name={member.name} size={40} />
            <Text style={styles.memberName}>{member.name}</Text>
          </View>
          <View style={styles.percentageInput}>
            <TextInput
              style={styles.percentageField}
              value={percentages[member._id]?.toString() || '0'}
              onChangeText={(value) => updatePercentage(member._id, value)}
              keyboardType="decimal-pad"
              placeholder="0"
            />
            <Text style={styles.percentageSymbol}>%</Text>
          </View>
          <Text style={styles.percentageAmount}>
            {(percentages[member._id] / 100 * totalAmount).toFixed(2)} ETB
          </Text>
        </View>
      ));
    }

    // Custom split
    return members.map(member => (
      <View key={member._id} style={styles.splitInputRow}>
        <View style={styles.memberInfo}>
          <Avatar name={member.name} size={40} />
          <Text style={styles.memberName}>{member.name}</Text>
        </View>
        <CurrencyInput
          value={customSplits[member._id]?.toString() || '0'}
          onChange={(value) => updateCustomSplit(member._id, value)}
          containerStyle={styles.customCurrencyInput}
        />
      </View>
    ));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('split_method')}</Text>
      
      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.optionCard,
            splitType === 'equal' && styles.optionCardActive,
          ]}
          onPress={() => handleSplitTypeChange('equal')}
        >
          <Icon
            name="account-multiple"
            size={24}
            color={splitType === 'equal' ? '#2E7D32' : '#666'}
          />
          <Text
            style={[
              styles.optionText,
              splitType === 'equal' && styles.optionTextActive,
            ]}
          >
            {i18n.t('equal')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            splitType === 'percentage' && styles.optionCardActive,
          ]}
          onPress={() => handleSplitTypeChange('percentage')}
        >
          <Icon
            name="percent"
            size={24}
            color={splitType === 'percentage' ? '#2E7D32' : '#666'}
          />
          <Text
            style={[
              styles.optionText,
              splitType === 'percentage' && styles.optionTextActive,
            ]}
          >
            {i18n.t('percentage')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.optionCard,
            splitType === 'custom' && styles.optionCardActive,
          ]}
          onPress={() => handleSplitTypeChange('custom')}
        >
          <Icon
            name="pencil"
            size={24}
            color={splitType === 'custom' ? '#2E7D32' : '#666'}
          />
          <Text
            style={[
              styles.optionText,
              splitType === 'custom' && styles.optionTextActive,
            ]}
          >
            {i18n.t('custom')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.splitsContainer}>
        {renderSplitInputs()}
      </View>

      <View style={styles.totalContainer}>
        <Text style={styles.totalLabel}>{i18n.t('total')}:</Text>
        <Text style={styles.totalAmount}>{totalAmount.toFixed(2)} ETB</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  optionCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 4,
  },
  optionCardActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  optionText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  optionTextActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  splitsContainer: {
    marginTop: 8,
  },
  splitInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberName: {
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
  percentageInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  percentageField: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 8,
    textAlign: 'center',
    fontSize: 14,
  },
  percentageSymbol: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  percentageAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF9800',
    minWidth: 80,
    textAlign: 'right',
  },
  customCurrencyInput: {
    width: 120,
  },
  equalSplitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  equalSplitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    marginLeft: 8,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
  },
});

export default SplitOptions;