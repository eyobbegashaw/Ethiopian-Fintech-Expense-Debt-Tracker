import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import {
  Avatar,
  useTheme,
  ActivityIndicator,
  Button,
  TextInput,
  Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { groupService } from '../services/groupService';
import { authService } from '../services/authService';
import { backupService } from '../services/backupService';
import { copyToClipboard } from '../utils/clipboardUtils';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatAppDate } from '../utils/dateUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EthiopianGregorianDatePicker from '../components/Common/EthiopianGregorianDatePicker';

const ProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user, logout, updateUser } = useAuth();
  const { themeMode, toggleTheme } = useAppTheme();
  const { language, changeLanguage, isAmharic, t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [notifications, setNotifications] = useState(
    user?.settings?.notifications?.inApp !== false
  );
  const [stats, setStats] = useState({ totalBalance: 0, activeGroups: 0 });

  // Bottom Sheet Modal States
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showDatePickerPreview, setShowDatePickerPreview] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Change Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Local Backup & Restore States
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupTab, setBackupTab] = useState('export'); // 'export' | 'restore'
  const [exportingBackup, setExportingBackup] = useState(false);
  const [exportedJson, setExportedJson] = useState('');
  const [exportedSummary, setExportedSummary] = useState(null);
  const [copiedBackup, setCopiedBackup] = useState(false);

  const [restoreInputJson, setRestoreInputJson] = useState('');
  const [validatingRestore, setValidatingRestore] = useState(false);
  const [validatedBackup, setValidatedBackup] = useState(null);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

  useEffect(() => {
    loadUserStats();
  }, []);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
  }, [user]);

  const loadUserStats = async () => {
    try {
      const response = await groupService.getGroups();
      const groups = Array.isArray(response.data) ? response.data : [];
      let balance = 0;
      groups.forEach((g) => {
        balance += (g.userBalance || 0);
      });
      setStats({
        totalBalance: Math.round(balance * 100) / 100,
        activeGroups: groups.length,
      });
    } catch (_e) {
      // Keep initial stats if loading fails
    }
  };

  const handleToggleNotifications = async (value) => {
    setNotifications(value);
    try {
      await updateUser({
        settings: {
          ...user?.settings,
          notifications: {
            ...user?.settings?.notifications,
            inApp: value,
            push: value,
          },
        },
      });
    } catch (error) {
      console.error('Failed to update notification setting:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert(t('error') || 'Error', t('name_required') || 'Name is required');
      return;
    }

    try {
      setLoading(true);
      await updateUser({ name: name.trim(), email: email.trim() || undefined });
      Alert.alert(t('success') || 'Success', t('profile_updated') || 'Profile updated successfully');
      setEditing(false);
    } catch (error) {
      Alert.alert(
        t('error') || 'Error',
        error.response?.data?.message || t('something_wrong') || 'Something went wrong'
      );
    } finally {
      setLoading(false);
    }
  };

  // ---------------- AVATAR ACTIONS ----------------
  const convertToDataUrl = async (asset) => {
    if (!asset) return null;
    if (asset.base64) {
      const mime = asset.mimeType || 'image/jpeg';
      return `data:${mime};base64,${asset.base64}`;
    }
    if (asset.uri) {
      if (asset.uri.startsWith('data:image')) {
        return asset.uri;
      }
      try {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.warn('Fetch blob conversion fallback to uri:', err);
        return asset.uri;
      }
    }
    return null;
  };

  const handlePickFromGallery = async () => {
    setShowAvatarModal(false);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error') || 'Error', t('permission_denied') || 'Gallery permission denied');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingAvatar(true);
        const imageUri = await convertToDataUrl(result.assets[0]);
        if (imageUri) {
          await updateUser({ avatar: imageUri });
          Alert.alert(t('success') || 'Success', t('profile_image_updated') || 'Profile picture updated!');
        }
      }
    } catch (err) {
      console.error('Gallery pick error:', err);
      Alert.alert(t('error') || 'Error', t('image_upload_failed') || 'Failed to update profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleTakePhoto = async () => {
    setShowAvatarModal(false);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error') || 'Error', t('permission_denied') || 'Camera permission denied');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploadingAvatar(true);
        const imageUri = await convertToDataUrl(result.assets[0]);
        if (imageUri) {
          await updateUser({ avatar: imageUri });
          Alert.alert(t('success') || 'Success', t('profile_image_updated') || 'Profile picture updated!');
        }
      }
    } catch (err) {
      console.error('Camera capture error:', err);
      Alert.alert(t('error') || 'Error', t('image_upload_failed') || 'Failed to update profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setShowAvatarModal(false);
    try {
      setUploadingAvatar(true);
      await updateUser({ avatar: null });
      Alert.alert(t('success') || 'Success', t('profile_image_updated') || 'Profile picture removed');
    } catch (err) {
      console.error('Remove avatar error:', err);
      Alert.alert(t('error') || 'Error', t('image_upload_failed') || 'Failed to remove picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ---------------- LANGUAGE SELECTION ----------------
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

  const handleSelectLanguage = (langCode) => {
    changeLanguage(langCode);
    setShowLanguageModal(false);
  };

  // ---------------- CURRENCY SELECTION ----------------
  const currencies = [
    { code: 'ETB', symbol: 'ብር', name: 'Ethiopian Birr (የኢትዮጵያ ብር)', icon: 'cash' },
    { code: 'USD', symbol: '$', name: 'United States Dollar', icon: 'currency-usd' },
    { code: 'EUR', symbol: '€', name: 'Euro', icon: 'currency-eur' },
    { code: 'GBP', symbol: '£', name: 'British Pound', icon: 'currency-gbp' },
  ];

  const handleSelectCurrency = async (code) => {
    try {
      await updateUser({
        settings: {
          ...user?.settings,
          currency: code,
        },
      });
      setShowCurrencyModal(false);
    } catch (err) {
      console.error('Currency update error:', err);
      Alert.alert(t('error') || 'Error', t('something_wrong') || 'Failed to update currency');
    }
  };

  // ---------------- CALENDAR SELECTION ----------------
  const calendars = [
    {
      code: 'ethiopian',
      name: t('ethiopian_calendar') || 'Ethiopian Calendar (የኢትዮጵያ ዘመን አቆጣጠር)',
      nativeName: t('ethiopian_calendar_desc') || '13 Months of Sunshine (መስከረም - ጳጉሜ)',
      badge: '🇪🇹',
      icon: 'calendar-month',
    },
    {
      code: 'gregorian',
      name: t('gregorian_calendar') || 'Gregorian Calendar (የፈረንጆች ዘመን አቆጣጠር)',
      nativeName: t('gregorian_calendar_desc') || 'Western Calendar (Jan - Dec)',
      badge: '🌐',
      icon: 'calendar-range',
    },
  ];

  const currentCalendar = user?.settings?.calendar || 'ethiopian';

  const handleSelectCalendar = async (code) => {
    try {
      await updateUser({
        settings: {
          ...user?.settings,
          calendar: code,
        },
      });
      setShowCalendarModal(false);
    } catch (err) {
      console.error('Calendar update error:', err);
      Alert.alert(t('error') || 'Error', t('something_wrong') || 'Failed to update calendar');
    }
  };

  // ---------------- TIME FORMAT SELECTION ----------------
  const timeFormats = [
    {
      code: '12h',
      name: t('time_12h') || '12-Hour (AM/PM)',
      nativeName: t('time_12h_desc') || 'e.g. 02:30 PM (ጧት/ማታ)',
      badge: '12',
      icon: 'clock-outline',
    },
    {
      code: '24h',
      name: t('time_24h') || '24-Hour',
      nativeName: t('time_24h_desc') || 'e.g. 14:30',
      badge: '24',
      icon: 'clock-time-four-outline',
    },
  ];

  const currentTimeFormat = user?.settings?.timeFormat || '12h';

  const handleSelectTimeFormat = async (code) => {
    try {
      await updateUser({
        settings: {
          ...user?.settings,
          timeFormat: code,
        },
      });
      setShowTimeModal(false);
    } catch (err) {
      console.error('Time format update error:', err);
      Alert.alert(t('error') || 'Error', t('something_wrong') || 'Failed to update time format');
    }
  };

  // ---------------- CHANGE PASSWORD ----------------
  const handleSubmitChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError(t('current_password_required') || 'Current password is required');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError(t('password_min_length') || 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError(t('passwords_do_not_match') || 'New passwords do not match');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await authService.changePassword(currentPassword, newPassword);
      const msg = res.message || t('password_changed_success') || 'Password changed successfully!';
      setPasswordSuccess(msg);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        t('current_password_incorrect') ||
        'Failed to change password. Please check your current password.';
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  // ---------------- LOCAL BACKUP & RESTORE ----------------
  const handleExportBackup = async () => {
    try {
      setExportingBackup(true);
      const result = await backupService.exportBackup();
      setExportedJson(result.backupJson);
      setExportedSummary(result.summary);
      setCopiedBackup(false);
    } catch (err) {
      Alert.alert(t('error') || 'Error', err.message || 'Failed to export backup');
    } finally {
      setExportingBackup(false);
    }
  };

  const handleCopyBackup = async () => {
    if (!exportedJson) return;
    await copyToClipboard(exportedJson);
    setCopiedBackup(true);
    Alert.alert(t('success') || 'Success', t('backup_copied_success') || 'Backup data copied to clipboard!');
    setTimeout(() => setCopiedBackup(false), 3000);
  };

  const handleValidateRestore = async () => {
    setRestoreError('');
    setRestoreSuccess('');
    setValidatedBackup(null);

    if (!restoreInputJson.trim()) {
      setRestoreError(t('paste_backup_json') || 'Please paste backup data');
      return;
    }

    try {
      setValidatingRestore(true);
      const res = await backupService.validateBackup(restoreInputJson.trim());
      if (!res.isValid) {
        setRestoreError(res.error || t('invalid_backup') || 'Invalid backup format');
      } else {
        setValidatedBackup(res);
      }
    } catch (err) {
      setRestoreError(err.message || t('invalid_backup') || 'Invalid backup data');
    } finally {
      setValidatingRestore(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!validatedBackup?.payload) return;

    Alert.alert(
      t('confirm_restore_title') || 'Confirm Restore',
      t('confirm_restore_message') || 'Restoring will merge or replace records with the data from the backup. Are you sure you want to proceed?',
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: t('confirm') || 'Restore Data',
          onPress: async () => {
            try {
              setRestoringBackup(true);
              await backupService.restoreBackup(validatedBackup.payload);
              setRestoreSuccess(t('restore_success') || 'Data restored successfully!');
              setRestoreInputJson('');
              setValidatedBackup(null);
              await loadUserStats();
              setTimeout(() => {
                setShowBackupModal(false);
                setRestoreSuccess('');
              }, 1500);
            } catch (err) {
              setRestoreError(err.message || t('restore_failed') || 'Failed to restore backup');
            } finally {
              setRestoringBackup(false);
            }
          },
        },
      ]
    );
  };

  const MenuItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
    iconColor = theme.colors.primary,
    iconBg = 'rgba(46, 125, 50, 0.1)',
  }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !rightElement}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.menuIconSquircle, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : iconBg }]}>
          <Icon name={icon} size={22} color={iconColor} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuItemText, { color: theme.dark ? '#FFFFFF' : '#1C1C1E' }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.menuItemSubText, { color: theme.dark ? '#8E8E93' : '#8E8E93' }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightElement || (onPress && <Icon name="chevron-right" size={20} color={theme.dark ? '#636366' : '#C7C7CC'} />)}
    </TouchableOpacity>
  );

  const currentCurrency = user?.settings?.currency || 'ETB';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Luxury Emerald Hero Banner */}
      <View
        style={[
          styles.heroBanner,
          {
            backgroundColor: theme.dark ? '#0A2613' : '#0D381E',
            paddingTop: Math.max(insets.top + 16, Platform.OS === 'ios' ? 56 : 28),
          },
        ]}
      >
        {/* Ambient Top Glow Orbs */}
        <View style={styles.heroGlowOrbLeft} />
        <View style={styles.heroGlowOrbRight} />

        {/* Top Branding & Edit Action Bar */}
        <View style={styles.heroTopBar}>
          <View style={styles.heroBadgeRow}>
            <Icon name="star-four-points" size={14} color="#FFD700" />
            <Text style={styles.heroBadgeText}>እልፍ • ILF ACCOUNT</Text>
          </View>

          {!editing && (
            <TouchableOpacity
              style={styles.heroEditPill}
              onPress={() => setEditing(true)}
              activeOpacity={0.8}
            >
              <Icon name="account-edit-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroEditPillText}>
                {t('edit_profile') || 'Edit'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Avatar Presentation with Double Ring */}
        <View style={styles.avatarPresentation}>
          <View style={styles.avatarRingOuter}>
            <View style={styles.avatarRingInner}>
              {user?.avatar ? (
                <Avatar.Image
                  size={92}
                  source={{ uri: user.avatar }}
                  style={styles.avatarImage}
                />
              ) : (
                <Avatar.Text
                  size={92}
                  label={user?.name?.charAt(0) || 'እ'}
                  style={styles.avatarText}
                  labelStyle={styles.avatarTextLabel}
                />
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.cameraFabButton}
            onPress={() => setShowAvatarModal(true)}
            activeOpacity={0.85}
          >
            {uploadingAvatar ? (
              <ActivityIndicator size={16} color="#0D381E" />
            ) : (
              <Icon name="camera" size={17} color="#0D381E" />
            )}
          </TouchableOpacity>
        </View>

        {/* User Details */}
        {!editing ? (
          <View style={styles.heroUserInfo}>
            <Text style={[styles.heroUserName, isAmharic && styles.amharicFont]}>
              {user?.name || 'እልፍ ተጠቃሚ'}
            </Text>

            <View style={styles.heroPhoneChip}>
              <Icon name="cellphone" size={14} color="#00E676" style={{ marginRight: 6 }} />
              <Text style={styles.heroPhoneText}>{user?.phone || '09...'}</Text>
              <Icon name="check-decagram" size={14} color="#00E676" style={{ marginLeft: 6 }} />
            </View>

            {user?.email ? (
              <View style={styles.heroEmailRow}>
                <Icon name="email-outline" size={13} color="rgba(255,255,255,0.7)" style={{ marginRight: 5 }} />
                <Text style={styles.heroEmailText}>{user.email}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.editFormHero}>
            <TextInput
              label={t('name') || 'Name'}
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.editInputHero}
              textColor="#FFFFFF"
              outlineColor="rgba(255,255,255,0.3)"
              activeOutlineColor="#FFD700"
            />
            <TextInput
              label={t('email') || 'Email'}
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.editInputHero}
              keyboardType="email-address"
              textColor="#FFFFFF"
              outlineColor="rgba(255,255,255,0.3)"
              activeOutlineColor="#FFD700"
            />
            <View style={styles.editActionsHero}>
              <Button
                mode="outlined"
                textColor="#FFFFFF"
                onPress={() => setEditing(false)}
                style={styles.editActionCancel}
              >
                {t('cancel') || 'Cancel'}
              </Button>
              <Button
                mode="contained"
                onPress={handleUpdateProfile}
                loading={loading}
                disabled={loading}
                style={styles.editActionSave}
              >
                {t('save') || 'Save'}
              </Button>
            </View>
          </View>
        )}
      </View>

      {/* Floating 3-Metric Stats Dashboard Card */}
      <View
        style={[
          styles.floatingStatsCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.dark ? '#333333' : '#E8ECE8',
          },
        ]}
      >
        {/* Metric 1: Total Balance */}
        <View style={styles.statCol}>
          <View style={[styles.statIconWrap, { backgroundColor: stats.totalBalance >= 0 ? '#E8F5E9' : '#FFF3E0' }]}>
            <Icon
              name={stats.totalBalance >= 0 ? 'cash-check' : 'cash-refund'}
              size={20}
              color={stats.totalBalance >= 0 ? '#2E7D32' : '#E65100'}
            />
          </View>
          <Text style={[styles.statValueText, { color: stats.totalBalance >= 0 ? '#2E7D32' : '#E65100' }]}>
            {stats.totalBalance > 0 ? `+${stats.totalBalance}` : stats.totalBalance} {currentCurrency}
          </Text>
          <Text style={[styles.statLabelText, { color: theme.dark ? '#AAAAAA' : '#666666' }]}>
            {t('total_balance') || 'Balance'}
          </Text>
        </View>

        <View style={[styles.statVerticalDivider, { backgroundColor: theme.dark ? '#333' : '#E0E0E0' }]} />

        {/* Metric 2: Active Groups */}
        <View style={styles.statCol}>
          <View style={[styles.statIconWrap, { backgroundColor: '#E3F2FD' }]}>
            <Icon name="account-group" size={20} color="#1565C0" />
          </View>
          <Text style={[styles.statValueText, { color: theme.dark ? '#FFFFFF' : '#1565C0' }]}>
            {stats.activeGroups}
          </Text>
          <Text style={[styles.statLabelText, { color: theme.dark ? '#AAAAAA' : '#666666' }]}>
            {t('active_groups') || 'Groups'}
          </Text>
        </View>

        <View style={[styles.statVerticalDivider, { backgroundColor: theme.dark ? '#333' : '#E0E0E0' }]} />

        {/* Metric 3: Account Status */}
        <View style={styles.statCol}>
          <View style={[styles.statIconWrap, { backgroundColor: '#E8F5E9' }]}>
            <Icon name="shield-check" size={20} color="#2E7D32" />
          </View>
          <Text style={[styles.statValueText, { color: '#2E7D32' }]}>
            {isAmharic ? 'ተረጋግጧል' : 'Verified'}
          </Text>
          <Text style={[styles.statLabelText, { color: theme.dark ? '#AAAAAA' : '#666666' }]}>
            {isAmharic ? 'የእልፍ አባል' : 'Member'}
          </Text>
        </View>
      </View>

      {/* ---------------- SECTION 1: PREFERENCES & LOCALIZATION ---------------- */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionHeaderText, { color: theme.dark ? '#81C784' : '#2E7D32' }]}>
          {isAmharic ? 'ምርጫዎች እና ቋንቋ' : 'PREFERENCES & LOCALIZATION'}
        </Text>
      </View>

      <View style={[styles.modernCard, { backgroundColor: theme.colors.surface }]}>
        <MenuItem
          icon="translate"
          iconColor="#2E7D32"
          iconBg="#E8F5E9"
          title={t('language') || 'Language'}
          subtitle={isAmharic ? 'የመተግበሪያውን ቋንቋ ይቀይሩ' : 'App language selection'}
          rightElement={
            <View style={[styles.pillBadge, { backgroundColor: isAmharic ? '#E8F5E9' : '#E3F2FD' }]}>
              <Text style={[styles.pillBadgeText, { color: isAmharic ? '#2E7D32' : '#1565C0' }]}>
                {language === 'am' ? 'አማርኛ' : 'English'}
              </Text>
              <Icon name="chevron-right" size={16} color="#888" style={{ marginLeft: 4 }} />
            </View>
          }
          onPress={() => setShowLanguageModal(true)}
        />
        <Divider style={[styles.divider, { backgroundColor: theme.dark ? '#2C2C2C' : '#F0F0F0' }]} />

        <MenuItem
          icon="theme-light-dark"
          iconColor="#F57C00"
          iconBg="#FFF3E0"
          title={t('dark_mode') || 'Dark Mode'}
          subtitle={isAmharic ? 'የቀን / የሌሊት ገጽታ' : 'Toggle dark / light appearance'}
          rightElement={
            <Switch
              value={themeMode === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: '#B0BEC5', true: '#4CAF50' }}
              thumbColor={themeMode === 'dark' ? '#fff' : '#f4f3f4'}
            />
          }
        />
        <Divider style={[styles.divider, { backgroundColor: theme.dark ? '#2C2C2C' : '#F0F0F0' }]} />

        <MenuItem
          icon="currency-usd"
          iconColor="#0288D1"
          iconBg="#E1F5FE"
          title={t('currency') || 'Currency'}
          subtitle={isAmharic ? 'ዋና የክፍያ መገበያያ' : 'Primary ledger currency'}
          rightElement={
            <View style={[styles.pillBadge, { backgroundColor: '#E1F5FE' }]}>
              <Text style={[styles.pillBadgeText, { color: '#0288D1' }]}>
                {currentCurrency}
              </Text>
              <Icon name="chevron-right" size={16} color="#888" style={{ marginLeft: 4 }} />
            </View>
          }
          onPress={() => setShowCurrencyModal(true)}
        />
        <Divider style={[styles.divider, { backgroundColor: theme.dark ? '#2C2C2C' : '#F0F0F0' }]} />

        <MenuItem
          icon="calendar-month-outline"
          iconColor="#7B1FA2"
          iconBg="#F3E5F5"
          title={t('calendar') || 'Calendar'}
          subtitle={isAmharic ? 'የቀን መቁጠሪያ ስርዓት' : 'Date calendar system'}
          rightElement={
            <View style={[styles.pillBadge, { backgroundColor: '#F3E5F5' }]}>
              <Text style={[styles.pillBadgeText, { color: '#7B1FA2' }]}>
                {currentCalendar === 'ethiopian'
                  ? (isAmharic ? 'የኢትዮጵያ' : 'Ethiopian')
                  : (isAmharic ? 'የፈረንጆች' : 'Gregorian')}
              </Text>
              <Icon name="chevron-right" size={16} color="#888" style={{ marginLeft: 4 }} />
            </View>
          }
          onPress={() => setShowCalendarModal(true)}
        />
        <Divider style={[styles.divider, { backgroundColor: theme.dark ? '#2C2C2C' : '#F0F0F0' }]} />

        <MenuItem
          icon="clock-outline"
          iconColor="#00796B"
          iconBg="#E0F2F1"
          title={t('time_format') || 'Time Format'}
          subtitle={isAmharic ? 'የሰዓት ማሳያ' : '12h or 24h clock display'}
          rightElement={
            <View style={[styles.pillBadge, { backgroundColor: '#E0F2F1' }]}>
              <Text style={[styles.pillBadgeText, { color: '#00796B' }]}>
                {currentTimeFormat === '12h' ? '12h (AM/PM)' : '24h'}
              </Text>
              <Icon name="chevron-right" size={16} color="#888" style={{ marginLeft: 4 }} />
            </View>
          }
          onPress={() => setShowTimeModal(true)}
        />
      </View>

      {/* ---------------- SECTION 2: SECURITY & DATA ---------------- */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionHeaderText, { color: theme.dark ? '#81C784' : '#2E7D32' }]}>
          {isAmharic ? 'ደህንነት እና መረጃ' : 'SECURITY & DATA'}
        </Text>
      </View>

      <View style={[styles.modernCard, { backgroundColor: theme.colors.surface }]}>
        <MenuItem
          icon="bell-ring-outline"
          iconColor="#E65100"
          iconBg="#FFF3E0"
          title={t('notifications') || 'Notifications'}
          subtitle={isAmharic ? 'የክፍያ እና የቡድን ማሳወቂያዎች' : 'Expense & group activity alerts'}
          rightElement={
            <Switch
              value={notifications}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: '#B0BEC5', true: '#4CAF50' }}
              thumbColor={notifications ? '#fff' : '#f4f3f4'}
            />
          }
        />
        <Divider style={[styles.divider, { backgroundColor: theme.dark ? '#2C2C2C' : '#F0F0F0' }]} />

        <MenuItem
          icon="shield-key-outline"
          iconColor="#1B5E20"
          iconBg="#E8F5E9"
          title={t('change_password') || 'Change Password'}
          subtitle={isAmharic ? 'የመግቢያ የይለፍ ቃልዎን ያዘምኑ' : 'Update your account password'}
          onPress={() => {
            setPasswordError('');
            setPasswordSuccess('');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setShowPasswordModal(true);
          }}
        />
        <Divider style={[styles.divider, { backgroundColor: theme.dark ? '#2C2C2C' : '#F0F0F0' }]} />

        <MenuItem
          icon="database-sync-outline"
          iconColor="#0D47A1"
          iconBg="#E3F2FD"
          title={t('backup_and_restore') || 'Local Backup & Restore'}
          subtitle={isAmharic ? 'የውሂብ ምትኬ ያስቀምጡ ወይም ይመልሱ' : 'Export or restore your ledgers'}
          rightElement={
            <View style={[styles.pillBadge, { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.pillBadgeText, { color: '#2E7D32' }]}>
                {t('export_backup') || 'Backup'}
              </Text>
              <Icon name="chevron-right" size={16} color="#888" style={{ marginLeft: 4 }} />
            </View>
          }
          onPress={() => {
            setRestoreError('');
            setRestoreSuccess('');
            setValidatedBackup(null);
            setShowBackupModal(true);
          }}
        />
      </View>

      {/* ---------------- SECTION 3: APP INFO & LOGOUT ---------------- */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionHeaderText, { color: theme.dark ? '#81C784' : '#2E7D32' }]}>
          {isAmharic ? 'ስለ መተግበሪያው' : 'ABOUT & ACCOUNT'}
        </Text>
      </View>

      <View style={[styles.modernCard, { backgroundColor: theme.colors.surface }]}>
        <MenuItem
          icon="information-outline"
          iconColor="#00897B"
          iconBg="#E0F2F1"
          title={t('about') || 'About እልፍ'}
          subtitle={isAmharic ? 'ስሪት 1.0.0 • የኢትዮጵያ ፊንቴክ' : 'Version 1.0.0 • Ethiopian Fintech'}
          onPress={() => setShowAboutModal(true)}
        />
      </View>

      {/* Modern Destructive Logout Button */}
      <TouchableOpacity
        style={[
          styles.modernLogoutCard,
          {
            backgroundColor: theme.dark ? '#2D1517' : '#FFEBEE',
            borderColor: theme.dark ? '#5C1D24' : '#FFCDD2',
          },
        ]}
        onPress={() => setShowLogoutModal(true)}
        activeOpacity={0.8}
      >
        <View style={styles.logoutContentRow}>
          <View style={styles.logoutSquircle}>
            <Icon name="logout-variant" size={20} color="#D32F2F" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.logoutButtonTitle}>{t('logout') || 'Log Out'}</Text>
            <Text style={styles.logoutButtonSubtitle}>
              {isAmharic ? 'ከአካውንትዎ በደህንነት ይውጡ' : 'Sign out of your session securely'}
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color="#D32F2F" />
        </View>
      </TouchableOpacity>

      {/* Version Footer */}
      <View style={styles.profileFooter}>
        <Text style={[styles.versionText, { color: theme.dark ? '#666666' : '#999999' }]}>
          እልፍ (Ilf) • {t('version') || 'Version'} 1.0.0
        </Text>
      </View>

      {/* ---------------- 1. AVATAR BOTTOM SHEET MODAL ---------------- */}
      <Modal
        visible={showAvatarModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAvatarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowAvatarModal(false)}
          />
          <View style={[styles.bottomSheetContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>
                {t('change_profile_photo') || 'Change Profile Photo'}
              </Text>
              <TouchableOpacity onPress={() => setShowAvatarModal(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#aaa' : '#666'} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.sheetOptionItem} onPress={handleTakePhoto}>
              <View style={styles.sheetOptionLeft}>
                <View style={[styles.sheetOptionIconWrap, { backgroundColor: '#E8F5E9' }]}>
                  <Icon name="camera" size={22} color="#2E7D32" />
                </View>
                <Text style={[styles.sheetOptionCode, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>
                  {t('take_photo') || 'Take Photo'}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={theme.dark ? '#666' : '#ccc'} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetOptionItem} onPress={handlePickFromGallery}>
              <View style={styles.sheetOptionLeft}>
                <View style={[styles.sheetOptionIconWrap, { backgroundColor: '#E3F2FD' }]}>
                  <Icon name="image" size={22} color="#1976D2" />
                </View>
                <Text style={[styles.sheetOptionCode, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>
                  {t('choose_from_gallery') || 'Choose from Gallery'}
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={theme.dark ? '#666' : '#ccc'} />
            </TouchableOpacity>

            {user?.avatar && (
              <TouchableOpacity style={styles.sheetOptionItem} onPress={handleRemoveAvatar}>
                <View style={styles.sheetOptionLeft}>
                  <View style={[styles.sheetOptionIconWrap, { backgroundColor: '#FFEBEE' }]}>
                    <Icon name="trash-can-outline" size={22} color="#D32F2F" />
                  </View>
                  <Text style={[styles.sheetOptionCode, { color: '#D32F2F' }]}>
                    {t('remove_photo') || 'Remove Photo'}
                  </Text>
                </View>
                <Icon name="chevron-right" size={20} color={theme.dark ? '#666' : '#ccc'} />
              </TouchableOpacity>
            )}

            <Button
              mode="outlined"
              onPress={() => setShowAvatarModal(false)}
              style={{ marginTop: 12, borderRadius: 12 }}
            >
              {t('cancel') || 'Cancel'}
            </Button>
          </View>
        </View>
      </Modal>

      {/* ---------------- 2. LANGUAGE BOTTOM SHEET MODAL ---------------- */}
      <Modal
        visible={showLanguageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowLanguageModal(false)}
          />
          <View style={[styles.bottomSheetContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="translate" size={24} color={theme.colors.primary} />
                <Text style={[styles.modalTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>
                  {t('select_language') || 'Select Language'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#aaa' : '#666'} />
              </TouchableOpacity>
            </View>

            {languages.map((l) => {
              const isSelected = language === l.code;
              return (
                <TouchableOpacity
                  key={l.code}
                  style={[
                    styles.sheetOptionItem,
                    {
                      backgroundColor: isSelected
                        ? (theme.dark ? '#1B381E' : '#E8F5E9')
                        : (theme.dark ? '#262626' : '#f9f9f9'),
                      borderColor: isSelected ? theme.colors.primary : (theme.dark ? '#3C3C3C' : '#e0e0e0'),
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => handleSelectLanguage(l.code)}
                >
                  <View style={styles.sheetOptionLeft}>
                    <View
                      style={[
                        styles.sheetOptionIconWrap,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : (theme.dark ? '#333' : '#e0e0e0'),
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: 'bold',
                          color: isSelected ? '#fff' : (theme.dark ? '#ccc' : '#555'),
                        }}
                      >
                        {l.badge}
                      </Text>
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 16 }}>{l.flag}</Text>
                        <Text
                          style={[
                            styles.sheetOptionCode,
                            { color: theme.dark ? '#FFFFFF' : '#333333' },
                          ]}
                        >
                          {l.name}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.sheetOptionName,
                          { color: theme.dark ? '#AAAAAA' : '#666666' },
                        ]}
                      >
                        {l.nativeName}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Icon name="check-circle" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}

            <Button
              mode="outlined"
              onPress={() => setShowLanguageModal(false)}
              style={{ marginTop: 12, borderRadius: 12 }}
            >
              {t('cancel') || 'Cancel'}
            </Button>
          </View>
        </View>
      </Modal>

      {/* ---------------- 3. CURRENCY BOTTOM SHEET MODAL ---------------- */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowCurrencyModal(false)}
          />
          <View style={[styles.bottomSheetContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>
                {t('select_currency') || 'Select Currency'}
              </Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#aaa' : '#666'} />
              </TouchableOpacity>
            </View>

            {currencies.map((c) => {
              const isSelected = currentCurrency === c.code;
              return (
                <TouchableOpacity
                  key={c.code}
                  style={[
                    styles.sheetOptionItem,
                    {
                      backgroundColor: isSelected
                        ? (theme.dark ? '#1B381E' : '#E8F5E9')
                        : (theme.dark ? '#262626' : '#f9f9f9'),
                      borderColor: isSelected ? theme.colors.primary : (theme.dark ? '#3C3C3C' : '#e0e0e0'),
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => handleSelectCurrency(c.code)}
                >
                  <View style={styles.sheetOptionLeft}>
                    <View
                      style={[
                        styles.sheetOptionIconWrap,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : (theme.dark ? '#333' : '#e0e0e0'),
                        },
                      ]}
                    >
                      <Icon
                        name={c.icon}
                        size={22}
                        color={isSelected ? '#fff' : (theme.dark ? '#ccc' : '#555')}
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.sheetOptionCode,
                          { color: theme.dark ? '#FFFFFF' : '#333333' },
                        ]}
                      >
                        {c.code} ({c.symbol})
                      </Text>
                      <Text
                        style={[
                          styles.sheetOptionName,
                          { color: theme.dark ? '#AAAAAA' : '#666666' },
                        ]}
                      >
                        {c.name}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Icon name="check-circle" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}

            <Button
              mode="outlined"
              onPress={() => setShowCurrencyModal(false)}
              style={{ marginTop: 12, borderRadius: 12 }}
            >
              {t('cancel') || 'Cancel'}
            </Button>
          </View>
        </View>
      </Modal>

      {/* ---------------- 4. CALENDAR BOTTOM SHEET MODAL ---------------- */}
      <Modal
        visible={showCalendarModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowCalendarModal(false)}
          />
          <View style={[styles.bottomSheetContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="calendar-month" size={24} color={theme.colors.primary} />
                <Text style={[styles.modalTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>
                  {t('select_calendar') || 'Select Calendar'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCalendarModal(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#aaa' : '#666'} />
              </TouchableOpacity>
            </View>

            {calendars.map((cal) => {
              const isSelected = currentCalendar === cal.code;
              return (
                <TouchableOpacity
                  key={cal.code}
                  style={[
                    styles.sheetOptionItem,
                    {
                      backgroundColor: isSelected
                        ? (theme.dark ? '#1B381E' : '#E8F5E9')
                        : (theme.dark ? '#262626' : '#f9f9f9'),
                      borderColor: isSelected ? theme.colors.primary : (theme.dark ? '#3C3C3C' : '#e0e0e0'),
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => handleSelectCalendar(cal.code)}
                >
                  <View style={styles.sheetOptionLeft}>
                    <View
                      style={[
                        styles.sheetOptionIconWrap,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : (theme.dark ? '#333' : '#e0e0e0'),
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          color: isSelected ? '#fff' : (theme.dark ? '#ccc' : '#555'),
                        }}
                      >
                        {cal.badge}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.sheetOptionCode,
                          { color: theme.dark ? '#FFFFFF' : '#333333' },
                        ]}
                      >
                        {cal.name}
                      </Text>
                      <Text
                        style={[
                          styles.sheetOptionName,
                          { color: theme.dark ? '#AAAAAA' : '#666666' },
                        ]}
                      >
                        {cal.nativeName}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Icon name="check-circle" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}

            <Button
              mode="contained"
              icon="calendar-multiselect"
              onPress={() => {
                setShowCalendarModal(false);
                setTimeout(() => setShowDatePickerPreview(true), 250);
              }}
              style={{ marginTop: 14, borderRadius: 12, backgroundColor: theme.colors.primary }}
            >
              {isAmharic ? 'ቀን መምረጫ ክፈት • Open Date Picker' : 'Open Calendar Date Picker'}
            </Button>

            <Button
              mode="outlined"
              onPress={() => setShowCalendarModal(false)}
              style={{ marginTop: 8, borderRadius: 12 }}
            >
              {t('cancel') || 'Cancel'}
            </Button>
          </View>
        </View>
      </Modal>

      {/* Interactive Ethiopian & Gregorian Date Picker */}
      <EthiopianGregorianDatePicker
        visible={showDatePickerPreview}
        initialDate={new Date()}
        onConfirm={(d) => {
          setShowDatePickerPreview(false);
          Alert.alert(
            t('success') || 'Success',
            isAmharic
              ? `የተመረጠው ቀን: ${formatAppDate(d, { calendar: currentCalendar, language: 'am' })}`
              : `Selected Date: ${formatAppDate(d, { calendar: currentCalendar, language: 'en' })}`
          );
        }}
        onClose={() => setShowDatePickerPreview(false)}
      />

      {/* ---------------- 5. TIME FORMAT BOTTOM SHEET MODAL ---------------- */}
      <Modal
        visible={showTimeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowTimeModal(false)}
          />
          <View style={[styles.bottomSheetContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="clock-outline" size={24} color={theme.colors.primary} />
                <Text style={[styles.modalTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>
                  {t('select_time_format') || 'Select Time Format'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#aaa' : '#666'} />
              </TouchableOpacity>
            </View>

            {timeFormats.map((tf) => {
              const isSelected = currentTimeFormat === tf.code;
              return (
                <TouchableOpacity
                  key={tf.code}
                  style={[
                    styles.sheetOptionItem,
                    {
                      backgroundColor: isSelected
                        ? (theme.dark ? '#1B381E' : '#E8F5E9')
                        : (theme.dark ? '#262626' : '#f9f9f9'),
                      borderColor: isSelected ? theme.colors.primary : (theme.dark ? '#3C3C3C' : '#e0e0e0'),
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => handleSelectTimeFormat(tf.code)}
                >
                  <View style={styles.sheetOptionLeft}>
                    <View
                      style={[
                        styles.sheetOptionIconWrap,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary
                            : (theme.dark ? '#333' : '#e0e0e0'),
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: 'bold',
                          color: isSelected ? '#fff' : (theme.dark ? '#ccc' : '#555'),
                        }}
                      >
                        {tf.badge}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.sheetOptionCode,
                          { color: theme.dark ? '#FFFFFF' : '#333333' },
                        ]}
                      >
                        {tf.name}
                      </Text>
                      <Text
                        style={[
                          styles.sheetOptionName,
                          { color: theme.dark ? '#AAAAAA' : '#666666' },
                        ]}
                      >
                        {tf.nativeName}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Icon name="check-circle" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}

            <Button
              mode="outlined"
              onPress={() => setShowTimeModal(false)}
              style={{ marginTop: 12, borderRadius: 12 }}
            >
              {t('cancel') || 'Cancel'}
            </Button>
          </View>
        </View>
      </Modal>

      {/* ---------------- 6. CHANGE PASSWORD BOTTOM SHEET MODAL ---------------- */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowPasswordModal(false)}
          />
          <View style={[styles.bottomSheetContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="lock-reset" size={24} color={theme.colors.primary} />
                <Text style={[styles.modalTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>
                  {t('change_password') || 'Change Password'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#aaa' : '#666'} />
              </TouchableOpacity>
            </View>

            {passwordError ? (
              <View style={styles.errorBanner}>
                <Icon name="alert-circle-outline" size={18} color="#D32F2F" />
                <Text style={styles.errorBannerText}>{passwordError}</Text>
              </View>
            ) : null}

            {passwordSuccess ? (
              <View style={styles.successBanner}>
                <Icon name="check-circle-outline" size={18} color="#2E7D32" />
                <Text style={styles.successBannerText}>{passwordSuccess}</Text>
              </View>
            ) : null}

            <TextInput
              label={t('current_password') || 'Current Password'}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              mode="outlined"
              secureTextEntry={!showCurrentPassword}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showCurrentPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                />
              }
              style={[styles.passwordInput, { backgroundColor: theme.colors.surface }]}
              textColor={theme.dark ? '#FFFFFF' : '#333333'}
              outlineColor={theme.dark ? '#666666' : '#CCCCCC'}
              activeOutlineColor={theme.colors.primary}
            />

            <TextInput
              label={t('new_password') || 'New Password'}
              value={newPassword}
              onChangeText={setNewPassword}
              mode="outlined"
              secureTextEntry={!showNewPassword}
              left={<TextInput.Icon icon="lock-plus" />}
              right={
                <TextInput.Icon
                  icon={showNewPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                />
              }
              placeholder={t('password_min_length') || 'At least 6 characters'}
              style={[styles.passwordInput, { backgroundColor: theme.colors.surface }]}
              textColor={theme.dark ? '#FFFFFF' : '#333333'}
              outlineColor={theme.dark ? '#666666' : '#CCCCCC'}
              activeOutlineColor={theme.colors.primary}
            />

            <TextInput
              label={t('confirm_new_password') || 'Confirm New Password'}
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              mode="outlined"
              secureTextEntry={!showConfirmNewPassword}
              left={<TextInput.Icon icon="lock-check" />}
              right={
                <TextInput.Icon
                  icon={showConfirmNewPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                />
              }
              style={[styles.passwordInput, { backgroundColor: theme.colors.surface }]}
              textColor={theme.dark ? '#FFFFFF' : '#333333'}
              outlineColor={theme.dark ? '#666666' : '#CCCCCC'}
              activeOutlineColor={theme.colors.primary}
            />

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowPasswordModal(false)}
                style={styles.modalButton}
                disabled={passwordLoading}
              >
                {t('cancel') || 'Cancel'}
              </Button>
              <Button
                mode="contained"
                onPress={handleSubmitChangePassword}
                loading={passwordLoading}
                disabled={passwordLoading}
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              >
                {t('save') || 'Update'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------------- 4. ABOUT BOTTOM SHEET MODAL ---------------- */}
      <Modal
        visible={showAboutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAboutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowAboutModal(false)}
          />
          <View style={[styles.bottomSheetContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>
                {t('about') || 'About App'}
              </Text>
              <TouchableOpacity onPress={() => setShowAboutModal(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#aaa' : '#666'} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.aboutHeader}>
                <View style={styles.aboutLogoCircle}>
                  <Icon name="cash-multiple" size={36} color="#fff" />
                </View>
                <Text style={[styles.aboutAppName, { color: theme.colors.primary }]}>
                  እልፍ (Ilf Fintech)
                </Text>
                <Text style={[styles.aboutAppAmharic, { color: theme.dark ? '#CCCCCC' : '#555' }]}>
                  እልፍ - የኢትዮጵያ ወጪ እና እዳ ተቆጣጣሪ
                </Text>
                <View style={styles.aboutVersionBadge}>
                  <Text style={styles.aboutVersionText}>Version 1.0.0 (Production)</Text>
                </View>
              </View>

              <Text style={[styles.aboutDescriptionText, { color: theme.dark ? '#BBBBBB' : '#555555' }]}>
                {t('about_description')}
              </Text>

              <View style={styles.featureGrid}>
                <View style={[styles.featurePill, { backgroundColor: theme.dark ? '#262626' : '#f5f5f5' }]}>
                  <Icon name="account-group" size={18} color="#2E7D32" />
                  <Text style={[styles.featurePillText, { color: theme.dark ? '#FFFFFF' : '#333' }]}>
                    {isAmharic ? 'የቡድን እና የጓደኛ ወጪ መከፋፈያ' : 'Group & Friend Expense Split'}
                  </Text>
                </View>
                <View style={[styles.featurePill, { backgroundColor: theme.dark ? '#262626' : '#f5f5f5' }]}>
                  <Icon name="cellphone-wireless" size={18} color="#1976D2" />
                  <Text style={[styles.featurePillText, { color: theme.dark ? '#FFFFFF' : '#333' }]}>
                    {isAmharic ? 'የቴሌብር እና ንግድ ባንክ ክፍያ' : 'Telebirr & CBE Payment Links'}
                  </Text>
                </View>
                <View style={[styles.featurePill, { backgroundColor: theme.dark ? '#262626' : '#f5f5f5' }]}>
                  <Icon name="shield-check" size={18} color="#FF9800" />
                  <Text style={[styles.featurePillText, { color: theme.dark ? '#FFFFFF' : '#333' }]}>
                    {isAmharic ? 'ባዮሜትሪክ እና ከመስመር ውጭ ደህንነት' : 'Biometric & PIN Security'}
                  </Text>
                </View>
                <View style={[styles.featurePill, { backgroundColor: theme.dark ? '#262626' : '#f5f5f5' }]}>
                  <Icon name="translate" size={18} color="#9C27B0" />
                  <Text style={[styles.featurePillText, { color: theme.dark ? '#FFFFFF' : '#333' }]}>
                    {isAmharic ? 'ሙሉ የአማርኛ እና የእንግሊዝኛ ድጋፍ' : 'Bilingual: አማርኛ / English'}
                  </Text>
                </View>
              </View>

              <View style={styles.supportBox}>
                <Text style={[styles.supportTitle, { color: theme.dark ? '#FFFFFF' : '#333' }]}>
                  {isAmharic ? 'ድጋፍ እና አስተያየት' : 'Support & Feedback'}
                </Text>
                <Text style={styles.supportEmail}>support@ethiofintech.et</Text>
                <Text style={styles.supportCountry}>Addis Ababa, Ethiopia 🇪🇹</Text>
              </View>
            </ScrollView>

            <Button
              mode="contained"
              onPress={() => setShowAboutModal(false)}
              style={{ marginTop: 16, borderRadius: 12, backgroundColor: theme.colors.primary }}
            >
              {t('close') || 'Close'}
            </Button>
          </View>
        </View>
      </Modal>

      {/* ---------------- 5. LOGOUT CONFIRMATION BOTTOM SHEET MODAL ---------------- */}
      <Modal
        visible={showLogoutModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowLogoutModal(false)}
          />
          <View style={[styles.bottomSheetContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.dragHandle} />

            <View style={styles.logoutIconCircle}>
              <Icon name="logout" size={32} color="#D32F2F" />
            </View>

            <Text style={[styles.logoutTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>
              {t('logout') || 'Log Out'}
            </Text>
            <Text style={[styles.logoutSubtitle, { color: theme.dark ? '#AAAAAA' : '#666666' }]}>
              {t('confirm_logout') || 'Are you sure you want to log out of your account?'}
            </Text>

            <View
              style={[
                styles.logoutUserCard,
                { backgroundColor: theme.dark ? '#262626' : '#f5f5f5' },
              ]}
            >
              <Avatar.Text
                size={40}
                label={user?.name?.charAt(0) || 'U'}
                style={{ backgroundColor: theme.colors.primary }}
              />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.logoutUserName, { color: theme.dark ? '#FFFFFF' : '#333' }]}>
                  {user?.name}
                </Text>
                <Text style={{ fontSize: 13, color: '#888' }}>{user?.phone}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowLogoutModal(false)}
                style={styles.modalButton}
              >
                {t('cancel') || 'Cancel'}
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  setShowLogoutModal(false);
                  logout();
                }}
                style={[styles.modalButton, { backgroundColor: '#D32F2F' }]}
                icon="logout"
              >
                {t('logout') || 'Log Out'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* ---------------- 6. LOCAL BACKUP & RESTORE BOTTOM SHEET MODAL ---------------- */}
      <Modal
        visible={showBackupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBackupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalDismissArea}
            activeOpacity={1}
            onPress={() => setShowBackupModal(false)}
          />
          <View style={[styles.bottomSheetContent, { backgroundColor: theme.colors.surface, maxHeight: '90%' }]}>
            <View style={styles.dragHandle} />

            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Icon name="database-sync" size={24} color={theme.colors.primary} />
                <Text style={[styles.modalTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>
                  {t('backup_and_restore') || 'Local Backup & Restore'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowBackupModal(false)}>
                <Icon name="close" size={24} color={theme.dark ? '#aaa' : '#666'} />
              </TouchableOpacity>
            </View>

            {/* Segmented Tabs: Export vs Restore */}
            <View style={[styles.backupTabContainer, { backgroundColor: theme.dark ? '#222' : '#f0f0f0' }]}>
              <TouchableOpacity
                style={[styles.backupTabButton, backupTab === 'export' && styles.backupTabActive]}
                onPress={() => setBackupTab('export')}
              >
                <Text style={[styles.backupTabText, backupTab === 'export' ? styles.backupTabActiveText : { color: theme.dark ? '#ccc' : '#555' }]}>
                  {t('export_backup') || 'Export Backup'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.backupTabButton, backupTab === 'restore' && styles.backupTabActive]}
                onPress={() => setBackupTab('restore')}
              >
                <Text style={[styles.backupTabText, backupTab === 'restore' ? styles.backupTabActiveText : { color: theme.dark ? '#ccc' : '#555' }]}>
                  {t('restore_backup') || 'Restore Backup'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB CONTENT: EXPORT */}
            {backupTab === 'export' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 13, color: theme.dark ? '#bbb' : '#666', marginBottom: 12 }}>
                  {isAmharic
                    ? 'ሁሉንም የሒሳብ መረጃዎች፣ ግብይቶች፣ ቡድኖች፣ ዕዳዎች እና በጀቶችን በደህንነት ወደ ምትኬ ፋይል ያውጡ።'
                    : 'Export all your accounts, transactions, groups, debts, and budgets into a portable offline backup file.'}
                </Text>

                <Button
                  mode="contained"
                  icon="database-export"
                  onPress={handleExportBackup}
                  loading={exportingBackup}
                  disabled={exportingBackup}
                  style={{ borderRadius: 12, backgroundColor: theme.colors.primary, marginBottom: 12 }}
                >
                  {t('generate_backup') || 'Generate Local Backup'}
                </Button>

                {exportedSummary && (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.dark ? '#fff' : '#333', marginBottom: 6 }}>
                      {t('success') || 'Summary'}:
                    </Text>
                    <View style={styles.backupSummaryGrid}>
                      <View style={[styles.backupSummaryChip, { backgroundColor: theme.dark ? '#262626' : '#E8F5E9' }]}>
                        <Text style={{ fontSize: 11, color: '#2E7D32' }}>{t('accounts_count') || 'Accounts'}</Text>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.dark ? '#fff' : '#1B5E20' }}>{exportedSummary.accountsCount}</Text>
                      </View>
                      <View style={[styles.backupSummaryChip, { backgroundColor: theme.dark ? '#262626' : '#E3F2FD' }]}>
                        <Text style={{ fontSize: 11, color: '#1976D2' }}>{t('transactions_count') || 'Transactions'}</Text>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.dark ? '#fff' : '#0D47A1' }}>{exportedSummary.transactionsCount}</Text>
                      </View>
                      <View style={[styles.backupSummaryChip, { backgroundColor: theme.dark ? '#262626' : '#FFF3E0' }]}>
                        <Text style={{ fontSize: 11, color: '#E65100' }}>{t('groups_count') || 'Groups'}</Text>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.dark ? '#fff' : '#BF360C' }}>{exportedSummary.groupsCount}</Text>
                      </View>
                      <View style={[styles.backupSummaryChip, { backgroundColor: theme.dark ? '#262626' : '#F3E5F5' }]}>
                        <Text style={{ fontSize: 11, color: '#7B1FA2' }}>{t('debts_count') || 'Debts'}</Text>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.dark ? '#fff' : '#4A148C' }}>{exportedSummary.debtsCount}</Text>
                      </View>
                    </View>

                    <TextInput
                      mode="outlined"
                      multiline
                      numberOfLines={4}
                      value={exportedJson}
                      editable={false}
                      style={[
                        styles.backupJsonPreview,
                        {
                          backgroundColor: theme.dark ? '#1E1E1E' : '#F9F9F9',
                          borderColor: theme.dark ? '#444' : '#E0E0E0',
                        },
                      ]}
                      textColor={theme.dark ? '#A5D6A7' : '#2E7D32'}
                    />

                    <Button
                      mode="contained-tonal"
                      icon={copiedBackup ? 'check' : 'content-copy'}
                      onPress={handleCopyBackup}
                      style={{ borderRadius: 12, marginTop: 8 }}
                    >
                      {copiedBackup ? (t('copied') || 'Copied!') : (t('copy_backup_json') || 'Copy Backup Data')}
                    </Button>
                  </View>
                )}
              </ScrollView>
            )}

            {/* TAB CONTENT: RESTORE */}
            {backupTab === 'restore' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ fontSize: 13, color: theme.dark ? '#bbb' : '#666', marginBottom: 8 }}>
                  {isAmharic
                    ? 'ከዚህ በፊት ያወጡትን የምትኬ ጽሑፍ (JSON) እዚህ በመለጠፍ መረጃዎችዎን ይመልሱ።'
                    : 'Paste a valid backup JSON string below to restore your records on this device.'}
                </Text>

                {restoreError ? (
                  <View style={styles.errorBanner}>
                    <Icon name="alert-circle" size={18} color="#D32F2F" />
                    <Text style={styles.errorBannerText}>{restoreError}</Text>
                  </View>
                ) : null}

                {restoreSuccess ? (
                  <View style={styles.successBanner}>
                    <Icon name="check-circle" size={18} color="#2E7D32" />
                    <Text style={styles.successBannerText}>{restoreSuccess}</Text>
                  </View>
                ) : null}

                <TextInput
                  mode="outlined"
                  placeholder={t('paste_backup_json') || 'Paste backup JSON here...'}
                  multiline
                  numberOfLines={4}
                  value={restoreInputJson}
                  onChangeText={(txt) => {
                    setRestoreInputJson(txt);
                    setValidatedBackup(null);
                    setRestoreError('');
                  }}
                  style={{
                    fontSize: 12,
                    backgroundColor: theme.dark ? '#1E1E1E' : '#FFF',
                    marginBottom: 10,
                  }}
                />

                <Button
                  mode="outlined"
                  icon="shield-search"
                  onPress={handleValidateRestore}
                  loading={validatingRestore}
                  disabled={validatingRestore || !restoreInputJson.trim()}
                  style={{ borderRadius: 12, marginBottom: 12 }}
                >
                  {t('validate_backup') || 'Validate Backup'}
                </Button>

                {validatedBackup && (
                  <View
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: '#4CAF50',
                      backgroundColor: theme.dark ? '#1B2E1D' : '#E8F5E9',
                      marginBottom: 14,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Icon name="check-decagram" size={18} color="#2E7D32" />
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#2E7D32' }}>
                        {t('valid_backup') || 'Valid Backup (SHA-256 Verified)'}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: theme.dark ? '#A5D6A7' : '#1B5E20' }}>
                      {`${t('accounts_count') || 'Accounts'}: ${validatedBackup.summary.accountsCount} • ${t('transactions_count') || 'Transactions'}: ${validatedBackup.summary.transactionsCount} • ${t('debts_count') || 'Debts'}: ${validatedBackup.summary.debtsCount}`}
                    </Text>

                    <Button
                      mode="contained"
                      icon="database-import"
                      onPress={handleConfirmRestore}
                      loading={restoringBackup}
                      disabled={restoringBackup}
                      style={{ marginTop: 12, borderRadius: 10, backgroundColor: '#2E7D32' }}
                    >
                      {t('confirm') || 'Confirm & Restore Data'}
                    </Button>
                  </View>
                )}
              </ScrollView>
            )}

            <Button
              mode="text"
              onPress={() => setShowBackupModal(false)}
              style={{ marginTop: 8 }}
            >
              {t('close') || 'Close'}
            </Button>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  amharicFont: {
    fontFamily: 'Noto Serif Ethiopic, serif',
  },

  // ---------------- HERO BANNER ----------------
  heroBanner: {
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingBottom: 48,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(10, 36, 19, 0.25)',
      },
      default: {
        elevation: 6,
      },
    }),
  },
  heroGlowOrbLeft: {
    position: 'absolute',
    top: -40,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
  },
  heroGlowOrbRight: {
    position: 'absolute',
    bottom: -30,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
  },
  heroTopBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  heroBadgeText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginLeft: 6,
  },
  heroEditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroEditPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  avatarPresentation: {
    position: 'relative',
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarRingOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 215, 0, 0.4)',
  },
  avatarRingInner: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: '#0A2613',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarImage: {
    backgroundColor: '#1B5E20',
  },
  avatarText: {
    backgroundColor: '#1B5E20',
  },
  avatarTextLabel: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  cameraFabButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#FFD700',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#0D381E',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      },
      default: {
        elevation: 4,
      },
    }),
  },
  heroUserInfo: {
    alignItems: 'center',
  },
  heroUserName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroPhoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  heroPhoneText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  heroEmailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  heroEmailText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
  },
  editFormHero: {
    width: '100%',
    paddingTop: 8,
  },
  editInputHero: {
    marginBottom: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  editActionsHero: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  editActionCancel: {
    flex: 1,
    borderRadius: 12,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  editActionSave: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
  },

  // ---------------- FLOATING STATS DASHBOARD ----------------
  floatingStatsCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: -28,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    zIndex: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.08)',
      },
      default: {
        elevation: 5,
      },
    }),
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValueText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statLabelText: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  statVerticalDivider: {
    width: 1,
    height: 36,
  },

  // ---------------- MODERN CATEGORIZED SECTIONS ----------------
  sectionHeaderRow: {
    marginHorizontal: 20,
    marginTop: 22,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  modernCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconSquircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuItemSubText: {
    fontSize: 11.5,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ---------------- MODERN LOGOUT CARD ----------------
  modernLogoutCard: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 10px rgba(211, 47, 47, 0.08)',
      },
      default: {
        elevation: 2,
      },
    }),
  },
  logoutContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutSquircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#D32F2F',
  },
  logoutButtonSubtitle: {
    fontSize: 11.5,
    color: '#E57373',
    marginTop: 2,
  },
  profileFooter: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // ---------------- BOTTOM SHEET STYLES ----------------
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  bottomSheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
    ...Platform.select({
      web: {
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.25)',
      },
      default: {
        elevation: 10,
      },
    }),
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#888',
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sheetOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  sheetOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  sheetOptionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionCode: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sheetOptionName: {
    fontSize: 12,
    marginTop: 2,
  },
  passwordInput: {
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorBannerText: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  successBannerText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },

  // About Modal Styles
  aboutHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  aboutLogoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  aboutAppName: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  aboutAppAmharic: {
    fontSize: 14,
    marginTop: 2,
    textAlign: 'center',
  },
  aboutVersionBadge: {
    marginTop: 8,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aboutVersionText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  aboutDescriptionText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  featureGrid: {
    gap: 8,
    marginBottom: 16,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 10,
  },
  featurePillText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  supportBox: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    marginTop: 8,
  },
  supportTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  supportEmail: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: 'bold',
    marginTop: 2,
  },
  supportCountry: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },

  // Logout Modal Styles
  logoutIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFEBEE',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  logoutSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  logoutUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  logoutUserName: {
    fontSize: 15,
    fontWeight: '600',
  },

  // Local Backup & Restore Styles
  backupTabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  backupTabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  backupTabActive: {
    backgroundColor: '#2E7D32',
  },
  backupTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  backupTabActiveText: {
    color: '#fff',
  },
  backupSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 12,
  },
  backupSummaryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
  },
  backupJsonPreview: {
    maxHeight: 140,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
});

export default ProfileScreen;
