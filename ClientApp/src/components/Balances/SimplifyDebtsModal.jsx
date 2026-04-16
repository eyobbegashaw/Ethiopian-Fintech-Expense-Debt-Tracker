import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Card, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../translations';
import { settlementService } from '../../services/settlementService';

const SimplifyDebtsModal = ({ visible, onClose, debts, groupId, onSuccess }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [paymentOptions, setPaymentOptions] = useState(null);

  const handleSettle = async (debt) => {
    try {
      setLoading(true);
      const options = await settlementService.getPaymentOptions(groupId, debt.from.id);
      setPaymentOptions(options.data);
      setSelectedDebt(debt);
      setShowPaymentOptions(true);
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethod = async (method) => {
    try {
      setLoading(true);
      const settlementData = {
        groupId,
        fromUser: selectedDebt.from.id,
        toUser: selectedDebt.to.id,
        amount: selectedDebt.amount,
        method: method.method,
        transactionReference: method.reference || `TXN_${Date.now()}`,
        notes: `Payment via ${method.method}`,
      };

      await settlementService.createSettlement(settlementData);
      
      Alert.alert(i18n.t('success'), i18n.t('settlement_created_success'));
      setShowPaymentOptions(false);
      setSelectedDebt(null);
      onSuccess?.();
      onClose();
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    } finally {
      setLoading(false);
    }
  };

  const renderDebt = ({ item }) => (
    <Card style={styles.debtCard}>
      <Card.Content>
        <View style={styles.debtHeader}>
          <Icon name="cash" size={28} color="#FF9800" />
          <Text style={styles.debtAmount}>{item.amount} ETB</Text>
        </View>
        
        <Text style={styles.debtText}>
          {item.from.name} → {item.to.name}
        </Text>
        
        <Text style={styles.debtInstruction}>
          {i18n.t('simplify_debts_instruction')}
        </Text>
        
        <Button
          mode="contained"
          onPress={() => handleSettle(item)}
          style={styles.settleButton}
          icon="cash"
          loading={loading && selectedDebt === item}
          disabled={loading}
        >
          {i18n.t('settle_up')}
        </Button>
      </Card.Content>
    </Card>
  );

  const renderPaymentOptions = () => (
    <View style={styles.paymentOptionsContainer}>
      <Text style={styles.paymentTitle}>{i18n.t('select_payment_method')}</Text>
      <Text style={styles.paymentAmount}>
        {i18n.t('amount')}: {selectedDebt?.amount} ETB
      </Text>
      <Text style={styles.paymentTo}>
        {i18n.t('paying_to')}: {selectedDebt?.to.name}
      </Text>

      {paymentOptions?.paymentOptions?.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={styles.paymentOption}
          onPress={() => handlePaymentMethod(option)}
        >
          <Icon name={getMethodIcon(option.method)} size={24} color="#2E7D32" />
          <View style={styles.paymentOptionInfo}>
            <Text style={styles.paymentOptionName}>{option.method}</Text>
            {option.ussdCode && (
              <Text style={styles.paymentOptionCode}>{option.ussdCode}</Text>
            )}
            {option.instructions && (
              <Text style={styles.paymentOptionInstructions}>
                {option.instructions}
              </Text>
            )}
          </View>
          <Icon name="chevron-right" size={20} color="#999" />
        </TouchableOpacity>
      ))}

      <Button
        mode="outlined"
        onPress={() => setShowPaymentOptions(false)}
        style={styles.backButton}
      >
        {i18n.t('back')}
      </Button>
    </View>
  );

  const getMethodIcon = (method) => {
    switch (method) {
      case 'TeleBirr': return 'cellphone-wireless';
      case 'CBE Birr': return 'bank';
      case 'Amole': return 'wallet';
      case 'Cash': return 'cash';
      default: return 'credit-card';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {showPaymentOptions ? i18n.t('payment_method') : i18n.t('simplify_debts')}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {loading && !showPaymentOptions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : showPaymentOptions ? (
            renderPaymentOptions()
          ) : (
            <>
              <Text style={styles.subtitle}>
                {i18n.t('simplify_debts_description')}
              </Text>
              
              {debts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="check-circle" size={64} color="#4CAF50" />
                  <Text style={styles.emptyText}>{i18n.t('settled_up')}</Text>
                  <Text style={styles.emptySubtext}>
                    {i18n.t('no_pending_debts')}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={debts}
                  keyExtractor={(item, index) => index.toString()}
                  renderItem={renderDebt}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.debtsList}
                />
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  debtsList: {
    paddingBottom: 16,
  },
  debtCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  debtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  debtAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF9800',
    marginLeft: 8,
  },
  debtText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  debtInstruction: {
    fontSize: 12,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  settleButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  paymentOptionsContainer: {
    padding: 8,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  paymentAmount: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  paymentTo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
  },
  paymentOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  paymentOptionCode: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  paymentOptionInstructions: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  backButton: {
    marginTop: 12,
    borderColor: '#2E7D32',
  },
});

export default SimplifyDebtsModal;
