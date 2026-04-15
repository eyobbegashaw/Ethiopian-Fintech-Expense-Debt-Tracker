import React, { useState } from 'react';
import {
  View,    
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import {
  Card,
  Avatar,
  useTheme,
  ActivityIndicator,
  Button,
  TextInput,
  Divider,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../translations';
import { useAuth } from '../contexts/AuthContext';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';

const ProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  const { user, logout, updateUser } = useAuth();
  const { themeMode, toggleTheme, setThemeMode } = useAppTheme();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [language, setLanguage] = useState('en');
  const [notifications, setNotifications] = useState(true);

  const handleUpdateProfile = async () => {
    if (!name.trim()) {
      Alert.alert(i18n.t('error'), i18n.t('name_required'));
      return;
    }

    try {
      setLoading(true);
      await updateUser({ name, email });
      Alert.alert(i18n.t('success'), i18n.t('profile_updated'));
      setEditing(false);
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleLogout = () => {
    Alert.alert(
      i18n.t('logout'),
      i18n.t('confirm_logout'),
      [
        { text: i18n.t('cancel'), style: 'cancel' },
        {
          text: i18n.t('logout'),
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleChangeLanguage = (lang) => {
    setLanguage(lang);
    i18n.locale = lang;
    AsyncStorage.setItem('app_language', lang);
    Alert.alert(i18n.t('success'), i18n.t('language_changed'));
  };

  const MenuItem = ({ icon, title, onPress, rightElement }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Icon name={icon} size={24} color={theme.colors.primary} />
        <Text style={styles.menuItemText}>{title}</Text>
      </View>
      {rightElement || <Icon name="chevron-right" size={20} color="#ccc" />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Avatar.Text
            size={80}
            label={user?.name?.charAt(0) || '?'}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.editAvatarButton}>
            <Icon name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {!editing ? (
          <>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userPhone}>{user?.phone}</Text>
            {user?.email && <Text style={styles.userEmail}>{user?.email}</Text>}
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.editButtonText}>{i18n.t('edit_profile')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.editForm}>
            <TextInput
              label={i18n.t('name')}
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.editInput}
            />
            <TextInput
              label={i18n.t('email')}
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.editInput}
              keyboardType="email-address"
            />
            <View style={styles.editActions}>
              <Button
                mode="outlined"
                onPress={() => setEditing(false)}
                style={styles.editActionButton}
              >
                {i18n.t('cancel')}
              </Button>
              <Button
                mode="contained"
                onPress={handleUpdateProfile}
                loading={loading}
                disabled={loading}
                style={styles.editActionButton}
              >
                {i18n.t('save')}
              </Button>
            </View>
          </View>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <Card style={styles.statsCard}>
          <Card.Content style={styles.statsContent}>
            <Icon name="cash-multiple" size={24} color="#FF9800" />
            <Text style={styles.statsValue}>0 ETB</Text>
            <Text style={styles.statsLabel}>{i18n.t('total_balance')}</Text>
          </Card.Content>
        </Card>
        <Card style={styles.statsCard}>
          <Card.Content style={styles.statsContent}>
            <Icon name="account-group" size={24} color="#4CAF50" />
            <Text style={styles.statsValue}>0</Text>
            <Text style={styles.statsLabel}>{i18n.t('active_groups')}</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Menu Items */}
      <Card style={styles.menuCard}>
        <Card.Content>
          <MenuItem
            icon="bell-outline"
            title={i18n.t('notifications')}
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
              />
            }
          />
          <Divider style={styles.divider} />
          
          <MenuItem
            icon="translate"
            title={i18n.t('language')}
            onPress={() => {
              Alert.alert(
                i18n.t('select_language'),
                '',
                [
                  { text: 'English', onPress: () => handleChangeLanguage('en') },
                  { text: 'አማርኛ', onPress: () => handleChangeLanguage('am') },
                  { text: i18n.t('cancel'), style: 'cancel' },
                ]
              );
            }}
          />
          <Divider style={styles.divider} />
          
          <MenuItem
            icon="theme-light-dark"
            title={i18n.t('dark_mode')}
            rightElement={
              <Switch
                value={themeMode === 'dark'}
                onValueChange={toggleTheme}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
              />
            }
          />
          <Divider style={styles.divider} />
          
          <MenuItem
            icon="currency-usd"
            title={i18n.t('currency')}
            onPress={() => {
              Alert.alert(
                i18n.t('select_currency'),
                '',
                [
                  { text: 'ETB', onPress: () => {} },
                  { text: 'USD', onPress: () => {} },
                  { text: i18n.t('cancel'), style: 'cancel' },
                ]
              );
            }}
          />
          <Divider style={styles.divider} />
          
          <MenuItem
            icon="lock-outline"
            title={i18n.t('change_password')}
            onPress={handleChangePassword}
          />
          <Divider style={styles.divider} />
          
          <MenuItem
            icon="information-outline"
            title={i18n.t('about')}
            onPress={() => navigation.navigate('About')}
          />
          <Divider style={styles.divider} />
          
          <MenuItem
            icon="logout"
            title={i18n.t('logout')}
            onPress={handleLogout}
          />
        </Card.Content>
      </Card>

      {/* Version Info */}
      <Text style={styles.versionText}>
        {i18n.t('version')} 1.0.0
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: '#2E7D32',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2E7D32',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  editButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
  },
  editButtonText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  editForm: {
    width: '100%',
    marginTop: 16,
  },
  editInput: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  editActionButton: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    borderRadius: 12,
  },
  statsContent: {
    alignItems: 'center',
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statsLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  menuCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  divider: {
    marginVertical: 4,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginBottom: 30,
  },
});

export default ProfileScreen;
