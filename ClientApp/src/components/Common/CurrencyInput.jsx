import React, { useState } from 'react';
import {
  View,   
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from 'react-native-paper';

const CurrencyInput = ({ value, onChange, placeholder, currency = 'ETB' }) => {
  const theme = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  const formatNumber = (num) => {
    if (!num) return '';
    const parts = num.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const parseNumber = (str) => {
    return str.replace(/,/g, '');
  };

  const handleChangeText = (text) => {
    // Allow only numbers and decimal point
    let cleaned = text.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const decimalCount = (cleaned.match(/\./g) || []).length;
    if (decimalCount > 1) {
      cleaned = cleaned.slice(0, cleaned.lastIndexOf('.'));
    }
    
    // Limit to 2 decimal places
    if (cleaned.includes('.')) {
      const parts = cleaned.split('.');
      if (parts[1].length > 2) {
        cleaned = parts[0] + '.' + parts[1].slice(0, 2);
      }
    }
    
    onChange(cleaned);
  };

  const displayValue = value ? formatNumber(value) : '';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          {
            borderColor: isFocused ? theme.colors.primary : '#ddd',
            borderWidth: isFocused ? 2 : 1,
          },
        ]}
      >
        <Text style={styles.currencySymbol}>{currency}</Text>
        <TextInput
          style={styles.input}
          value={displayValue}
          onChangeText={handleChangeText}
          placeholder={placeholder || '0.00'}
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
      
      <View style={styles.quickAmounts}>
        {[100, 500, 1000, 5000].map((amount) => (
          <TouchableOpacity
            key={amount}
            style={styles.quickAmountButton}
            onPress={() => onChange(amount.toString())}
          >
            <Text style={styles.quickAmountText}>{amount}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#333',
    padding: 0,
  },
  quickAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  quickAmountButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default CurrencyInput;
