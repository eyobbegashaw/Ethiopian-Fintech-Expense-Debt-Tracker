import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  TextInput,
  Button,
  SegmentedButtons,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../translations';
import { groupService } from '../../services/groupService';
import FriendSelector from '../Common/FriendSelector';

const CreateGroupModal = ({ visible, onClose, onSuccess, userId }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Other');
  const [icon, setIcon] = useState('👥');
  const [simplifyDebts, setSimplifyDebts] = useState(true);
  const [selectedMembers, setSelectedMembers] = useState([]);

  const groupCategories = [
    { value: 'Household', label: i18n.t('household'), icon: 'home' },
    { value: 'Trip', label: i18n.t('trip'), icon: 'airplane' },
    { value: 'Event', label: i18n.t('event'), icon: 'party-popper' },
    { value: 'Coffee Ceremony', label: i18n.t('coffee_ceremony'), icon: 'coffee' },
    { value: 'Iddir', label: i18n.t('iddir'), icon: 'hand-heart' },
    { value: 'Equb', label: i18n.t('equb'), icon: 'cash-multiple' },
    { value: 'Other', label: i18n.t('other'), icon: 'dots-horizontal' },
  ];

  const iconOptions = [
    '👥', '🏠', '✈️', '🎉', '☕', '🤝', '💰', '🍽️', '🚗', '🎬', '🎁', '❤️'
  ];

  const handleCreate = async () => {
    if (!groupName.trim()) {
      Alert.alert(i18n.t('error'), i18n.t('group_name_required'));
      return;
    }

    const groupData = {
      name: groupName,
      description,
      category,
      icon,
      simplifyDebts,
      members: selectedMembers.map(m => ({ userId: m._id })),
    };

    try {
      setLoading(true);
      const response = await groupService.createGroup(groupData);
      Alert.alert(i18n.t('success'), i18n.t('group_created_success'));
      onSuccess?.(response.data);
      onClose();
      resetForm();
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setGroupName('');
    setDescription('');
    setCategory('Other');
    setIcon('👥');
    setSimplifyDebts(true);
    setSelectedMembers([]);
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>{i18n.t('group_basics')}</Text>
      
      <TextInput
        label={i18n.t('group_name')}
        value={groupName}
        onChangeText={setGroupName}
        mode="outlined"
        style={styles.input}
      />
      
      <TextInput
        label={i18n.t('group_description')}
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
      />

      <Text style={styles.sectionLabel}>{i18n.t('group_category')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
        {groupCategories.map(cat => (
          <TouchableOpacity
            key={cat.value}
            style={[
              styles.categoryCard,
              category === cat.value && styles.categoryCardActive,
            ]}
            onPress={() => setCategory(cat.value)}
          >
            <Icon name={cat.icon} size={24} color={category === cat.value ? '#2E7D32' : '#666'} />
            <Text
              style={[
                styles.categoryLabel,
                category === cat.value && styles.categoryLabelActive,
              ]}
            >
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.sectionLabel}>{i18n.t('group_icon')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconsScroll}>
        {iconOptions.map(iconOption => (
          <TouchableOpacity
            key={iconOption}
            style={[
              styles.iconCard,
              icon === iconOption && styles.iconCardActive,
            ]}
            onPress={() => setIcon(iconOption)}
          >
            <Text style={styles.iconText}>{iconOption}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>{i18n.t('simplify_debts')}</Text>
        <SegmentedButtons
          value={simplifyDebts ? 'yes' : 'no'}
          onValueChange={(value) => setSimplifyDebts(value === 'yes')}
          buttons={[
            { value: 'yes', label: i18n.t('yes') },
            { value: 'no', label: i18n.t('no') },
          ]}
          style={styles.switchButtons}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>{i18n.t('add_members')}</Text>
      <Text style={styles.stepSubtitle}>
        {i18n.t('add_members_description')}
      </Text>
      
      <FriendSelector
        friends={[]} // Would come from friends API
        selectedFriends={selectedMembers}
        onSelect={setSelectedMembers}
        multiSelect={true}
      />
    </View>
  );

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
            <Text style={styles.modalTitle}>{i18n.t('create_group')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {step === 1 ? renderStep1() : renderStep2()}
          </ScrollView>

          <View style={styles.modalFooter}>
            {step === 2 && (
              <Button
                mode="outlined"
                onPress={() => setStep(1)}
                style={styles.footerButton}
              >
                {i18n.t('back')}
              </Button>
            )}
            
            <Button
              mode="contained"
              onPress={step === 1 ? () => setStep(2) : handleCreate}
              loading={loading}
              disabled={loading}
              style={styles.footerButton}
            >
              {step === 1 ? i18n.t('next') : i18n.t('create')}
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 12,
    marginTop: 8,
  },
  categoriesScroll: {
    marginBottom: 16,
  },
  categoryCard: {
    alignItems: 'center',
    padding: 12,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    minWidth: 80,
  },
  categoryCardActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  categoryLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  categoryLabelActive: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  iconsScroll: {
    marginBottom: 16,
  },
  iconCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginRight: 12,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    width: 60,
    height: 60,
  },
  iconCardActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  iconText: {
    fontSize: 28,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  switchLabel: {
    fontSize: 14,
    color: '#666',
  },
  switchButtons: {
    width: 120,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  footerButton: {
    minWidth: 100,
  },
});

export default CreateGroupModal;