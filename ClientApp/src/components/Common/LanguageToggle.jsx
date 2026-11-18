import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../../contexts/LanguageContext';

const LanguageToggle = ({ style, compact = false }) => {
  const theme = useTheme();
  const { language, changeLanguage, isAmharic, t } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const languages = [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English (US)',
      badge: 'EN',
      flag: '🇺🇸',
    },
    {
      code: 'am',
      name: 'አማርኛ',
      nativeName: 'Amharic (Ethiopia)',
      badge: 'አማ',
      flag: '🇪🇹',
    },
  ];

  const handleSelect = (code) => {
    changeLanguage(code);
    setModalVisible(false);
  };

  const isDark = theme.dark;

  return (
    <View style={[styles.wrapper, style]}>
      {/* Trigger Button - Top Right Pill */}
      <TouchableOpacity
        style={[
          styles.triggerButton,
          {
            backgroundColor: isDark ? '#1F2937' : '#F0FDF4',
            borderColor: isDark ? '#374151' : '#BBF7D0',
          },
        ]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Icon name="translate" size={compact ? 15 : 17} color="#2E7D32" style={styles.icon} />
        <Text style={[styles.triggerText, { color: isDark ? '#F3F4F6' : '#166534' }]}>
          {language === 'am' ? '🇪🇹 አማርኛ' : '🇺🇸 English'}
        </Text>
        <Icon name="chevron-down" size={16} color={isDark ? '#9CA3AF' : '#2E7D32'} />
      </TouchableOpacity>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setModalVisible(false)}
          />
          <View
            style={[
              styles.bottomSheetContent,
              { backgroundColor: theme.colors.surface || (isDark ? '#1E1E1E' : '#FFFFFF') },
            ]}
          >
            {/* Drag Handle */}
            <View style={styles.dragHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleRow}>
                <View style={styles.headerIconWrap}>
                  <Icon name="translate" size={20} color="#2E7D32" />
                </View>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: isDark ? '#FFFFFF' : '#111827' },
                    isAmharic && styles.amharicFont,
                  ]}
                >
                  {isAmharic ? 'ቋንቋ ይምረጡ' : 'Select Language'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeBtn}
              >
                <Icon name="close" size={20} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <View style={styles.optionsList}>
              {languages.map((l) => {
                const isSelected = language === l.code;
                return (
                  <TouchableOpacity
                    key={l.code}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: isSelected
                          ? (isDark ? '#14381C' : '#E8F5E9')
                          : (isDark ? '#262626' : '#F9FAFB'),
                        borderColor: isSelected
                          ? '#2E7D32'
                          : (isDark ? '#374151' : '#E5E7EB'),
                      },
                    ]}
                    onPress={() => handleSelect(l.code)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionLeft}>
                      <View
                        style={[
                          styles.badgeWrap,
                          {
                            backgroundColor: isSelected
                              ? '#2E7D32'
                              : (isDark ? '#374151' : '#E5E7EB'),
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: isSelected ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#4B5563') },
                          ]}
                        >
                          {l.badge}
                        </Text>
                      </View>
                      <View style={styles.optionTextContainer}>
                        <View style={styles.flagTitleRow}>
                          <Text style={styles.flagText}>{l.flag}</Text>
                          <Text
                            style={[
                              styles.optionTitle,
                              { color: isDark ? '#FFFFFF' : '#111827' },
                              l.code === 'am' && styles.amharicFont,
                            ]}
                          >
                            {l.name}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.optionSubtitle,
                            { color: isDark ? '#9CA3AF' : '#6B7280' },
                          ]}
                        >
                          {l.nativeName}
                        </Text>
                      </View>
                    </View>

                    {/* Radio / Check Icon */}
                    <View
                      style={[
                        styles.radioOuter,
                        {
                          borderColor: isSelected
                            ? '#2E7D32'
                            : (isDark ? '#6B7280' : '#D1D5DB'),
                          backgroundColor: isSelected ? '#2E7D32' : 'transparent',
                        },
                      ]}
                    >
                      {isSelected && <Icon name="check" size={14} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: 'flex-end',
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      },
      default: {
        elevation: 1,
      },
    }),
  },
  icon: {
    marginRight: 2,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  bottomSheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    paddingTop: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 -4px 16px rgba(0,0,0,0.15)',
        maxWidth: 500,
        width: '100%',
        alignSelf: 'center',
      },
      default: {
        elevation: 16,
      },
    }),
  },
  dragHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9CA3AF',
    opacity: 0.4,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(46, 125, 50, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  badgeWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  optionTextContainer: {
    flex: 1,
  },
  flagTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flagText: {
    fontSize: 16,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  amharicFont: {
    fontFamily: 'Noto Serif Ethiopic, "material-community", "Material Design Icons", sans-serif',
  },
});

export default LanguageToggle;
