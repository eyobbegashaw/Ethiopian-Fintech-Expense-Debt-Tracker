import React, { useState } from 'react';
import {   
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { TextInput, Button, useTheme, HelperText } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import i18n from '../translations';

const LoginScreen = ({ navigation }) => {
  const theme = useTheme();
  const { login, loading: authLoading } = useAuth();
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    // Phone validation (Ethiopian format)
    const phoneRegex = /^[0-9]{9,12}$/;
    if (!phone) {
      newErrors.phone = i18n.t('phone_required');
    } else if (!phoneRegex.test(phone)) {
      newErrors.phone = i18n.t('invalid_phone');
    }
    
    // Password validation
    if (!password) {
      newErrors.password = i18n.t('password_required');
    } else if (password.length < 6) {
      newErrors.password = i18n.t('password_min_length');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      const result = await login(phone, password);
      
      if (result.success) {
        // Navigation handled by AuthContext
        console.log('Login successful');
      } else {
        Alert.alert(i18n.t('error'), result.message || i18n.t('login_failed'));
      }
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    navigation.navigate('Register');
  };

  const formatPhoneNumber = (text) => {
    // Remove non-numeric characters
    const cleaned = text.replace(/[^0-9]/g, '');
    setPhone(cleaned);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Icon name="cash-multiple" size={60} color="#fff" />
          </View>
          <Text style={styles.appName}>{i18n.t('app_name')}</Text>
          <Text style={styles.tagline}>{i18n.t('track_expenses_together')}</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formContainer}>
          <Text style={styles.welcomeText}>{i18n.t('welcome_back')}</Text>
          <Text style={styles.subtitleText}>{i18n.t('login_to_continue')}</Text>

          {/* Phone Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              label={i18n.t('phone_number')}
              value={phone}
              onChangeText={formatPhoneNumber}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
              left={<TextInput.Icon icon="cellphone" />}
              error={!!errors.phone}
              placeholder="0912345678"
              placeholderTextColor="#999"
            />
            <HelperText type="error" visible={!!errors.phone}>
              {errors.phone}
            </HelperText>
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              label={i18n.t('password')}
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry={!showPassword}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              error={!!errors.password}
            />
            <HelperText type="error" visible={!!errors.password}>
              {errors.password}
            </HelperText>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPasswordContainer}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>
              {i18n.t('forgot_password')}
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading || authLoading}
            disabled={loading || authLoading}
            style={styles.loginButton}
            contentStyle={styles.buttonContent}
            icon="login"
          >
            {i18n.t('login')}
          </Button>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>{i18n.t('or')}</Text>
            <View style={styles.divider} />
          </View>

          {/* Demo Credentials (Development Only) */}
          {__DEV__ && (
            <View style={styles.demoContainer}>
              <Text style={styles.demoTitle}>Demo Credentials (Dev Only)</Text>
              <View style={styles.demoCredentials}>
                <TouchableOpacity
                  style={styles.demoButton}
                  onPress={() => {
                    setPhone('0912345678');
                    setPassword('123456');
                  }}
                >
                  <Icon name="account" size={16} color="#2E7D32" />
                  <Text style={styles.demoText}>Demo User</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>{i18n.t('no_account')}</Text>
            <TouchableOpacity onPress={handleRegister}>
              <Text style={styles.registerLink}>{i18n.t('register')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Version Info */}
        <Text style={styles.versionText}>
          {i18n.t('version')} 1.0.0
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 60 : 40,
    marginBottom: 40,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputWrapper: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    fontSize: 16,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 12,
  },
  demoContainer: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  demoTitle: {
    fontSize: 12,
    color: '#FF8F00',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  demoCredentials: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  demoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  demoText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 20,
  },
});

export default LoginScreen;
