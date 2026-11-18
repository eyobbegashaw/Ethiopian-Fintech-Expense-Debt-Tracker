import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { TextInput, Button, HelperText, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeEthiopianPhone, isValidEthiopianPhone } from '../utils/phoneUtils';
import LanguageToggle from '../components/Common/LanguageToggle';

const LoginScreen = ({ navigation, route }) => {
  const theme = useTheme();
  const { login, loading: authLoading } = useAuth();
  const { t, isAmharic } = useLanguage();

  const [phone, setPhone] = useState(route?.params?.phone || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  useEffect(() => {
    if (route?.params?.phone) {
      setPhone(route.params.phone);
    }
  }, [route?.params?.phone]);

  const validateForm = () => {
    const newErrors = {};

    // Phone validation (Ethiopian 09 or 07 format)
    if (!phone) {
      newErrors.phone = t('phone_required');
    } else if (!isValidEthiopianPhone(phone)) {
      newErrors.phone = t('invalid_phone');
    }

    // Password validation
    if (!password) {
      newErrors.password = t('password_required');
    } else if (password.length < 6) {
      newErrors.password = t('password_min_length');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    setGeneralError('');
    if (!validateForm()) return;

    try {
      setLoading(true);
      const normalizedPhone = normalizeEthiopianPhone(phone);
      const result = await login(normalizedPhone, password);

      if (result.success) {
        console.log('Login successful');
      } else {
        const msg = result.message || t('login_failed');
        setGeneralError(msg);
        Alert.alert(t('error'), msg);
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        (error.message?.includes('Network Error') || !error.response
          ? t('network_error')
          : t('something_wrong'));
      setGeneralError(msg);
      Alert.alert(t('error'), msg);
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
    const cleaned = text.replace(/[^0-9]/g, '');
    setPhone(cleaned);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Bar with Language Selector on the Right */}
        <View style={styles.topBar}>
          <LanguageToggle />
        </View>

        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Icon name="cash-multiple" size={60} color="#fff" />
          </View>
          <Text style={[styles.appName, isAmharic && styles.amharicFont]}>
            {t('app_name')}
          </Text>
          <Text style={[styles.tagline, { color: theme.dark ? '#AAAAAA' : '#666666' }, isAmharic && styles.amharicFont]}>
            {t('track_expenses_together')}
          </Text>
        </View>

        {/* Form Section */}
        <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.welcomeText, { color: theme.dark ? '#FFFFFF' : '#333333' }, isAmharic && styles.amharicFont]}>
            {t('welcome_back')}
          </Text>
          <Text style={[styles.subtitleText, { color: theme.dark ? '#AAAAAA' : '#666666' }, isAmharic && styles.amharicFont]}>
            {t('login_to_continue')}
          </Text>

          {/* New Account Created Recovery Code Info Banner */}
          {route?.params?.recoveryCode ? (
            <View
              style={{
                backgroundColor: theme.dark ? '#1B2E1D' : '#E8F5E9',
                borderColor: '#4CAF50',
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Icon name="check-circle" size={18} color="#2E7D32" />
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#2E7D32' }}>
                  {isAmharic ? 'አካውንትዎ ተፈጥሯል' : 'Account Created Locally'}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: theme.dark ? '#A5D6A7' : '#2E7D32' }}>
                {isAmharic ? 'የመልሶ ማግኛ ኮድዎ፡ ' : 'Your Recovery Code: '}
                <Text style={{ fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}>
                  {route.params.recoveryCode}
                </Text>
              </Text>
            </View>
          ) : null}

          {/* Phone Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              label={t('phone_number')}
              value={phone}
              onChangeText={formatPhoneNumber}
              mode="outlined"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              textColor={theme.dark ? '#FFFFFF' : '#333333'}
              outlineColor={theme.dark ? '#666666' : '#CCCCCC'}
              activeOutlineColor={theme.colors.primary}
              keyboardType="phone-pad"
              left={<TextInput.Icon icon="cellphone" />}
              error={!!errors.phone}
              placeholder="09... or 07..."
              placeholderTextColor="#999"
            />
            <HelperText type="error" visible={!!errors.phone}>
              {errors.phone}
            </HelperText>
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              label={t('password')}
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={[styles.input, { backgroundColor: theme.colors.surface }]}
              textColor={theme.dark ? '#FFFFFF' : '#333333'}
              outlineColor={theme.dark ? '#666666' : '#CCCCCC'}
              activeOutlineColor={theme.colors.primary}
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
            <Text style={[styles.forgotPasswordText, isAmharic && styles.amharicFont]}>
              {t('forgot_password')}
            </Text>
          </TouchableOpacity>

          {/* Status / Error Banner */}
          {!!generalError && (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle" size={20} color="#D32F2F" />
              <Text style={[styles.errorBannerText, isAmharic && styles.amharicFont]}>
                {generalError}
              </Text>
            </View>
          )}

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
            {t('login')}
          </Button>

          {/* Quick Demo Credentials Autofill */}
          <TouchableOpacity
            style={styles.demoBox}
            onPress={() => {
              setPhone('0911223344');
              setPassword('password123');
            }}
          >
            <Text style={[styles.demoText, isAmharic && styles.amharicFont]}>
              💡 {t('demo_credentials')}: 0911223344 / password123
            </Text>
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={[styles.registerText, isAmharic && styles.amharicFont]}>
              {t('no_account')}
            </Text>
            <TouchableOpacity onPress={handleRegister}>
              <Text style={[styles.registerLink, isAmharic && styles.amharicFont]}>
                {t('register')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Version Info */}
        <Text style={[styles.versionText, isAmharic && styles.amharicFont]}>
          {t('version')} 1.0.0
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
    paddingTop: Platform.OS === 'ios' ? 40 : 10,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
      },
      default: {
        elevation: 4,
      },
    }),
  },
  appName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  amharicFont: {
    fontFamily: 'Noto Serif Ethiopic, "material-community", "Material Design Icons", sans-serif',
  },
  formContainer: {
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      },
      default: {
        elevation: 3,
      },
    }),
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputWrapper: {
    marginBottom: 12,
  },
  input: {},
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  demoBox: {
    marginBottom: 16,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#C8E6C9',
    alignItems: 'center',
  },
  demoText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  versionText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginTop: 20,
  },
});

export default LoginScreen;
