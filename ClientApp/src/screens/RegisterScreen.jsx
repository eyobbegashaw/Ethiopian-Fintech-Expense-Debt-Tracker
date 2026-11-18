import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {
  TextInput,
  Button,
  useTheme,
  HelperText,
  Checkbox,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { normalizeEthiopianPhone, isValidEthiopianPhone } from '../utils/phoneUtils';
import LanguageToggle from '../components/Common/LanguageToggle';
import { copyToClipboard } from '../utils/clipboardUtils';

const RegisterScreen = ({ navigation }) => {
  const theme = useTheme();
  const { register } = useAuth();
  const { t, isAmharic } = useLanguage();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [registeredPhone, setRegisteredPhone] = useState('');
  const [generatedRecoveryCode, setGeneratedRecoveryCode] = useState('');
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [copiedRecoveryCode, setCopiedRecoveryCode] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!phone) {
      newErrors.phone = t('phone_required');
    } else if (!isValidEthiopianPhone(phone)) {
      newErrors.phone = t('invalid_phone');
    }

    if (!password) {
      newErrors.password = t('password_required');
    } else if (password.length < 6) {
      newErrors.password = t('password_min_length');
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = t('password_required');
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = t('passwords_do_not_match');
    }

    if (!agreeTerms) {
      newErrors.agreeTerms = t('agree_to_terms');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    setGeneralError('');
    setSuccessMsg('');

    if (!validateForm()) {
      if (!agreeTerms) {
        setGeneralError(t('agree_to_terms'));
      }
      return;
    }

    try {
      setLoading(true);
      const normalizedPhone = normalizeEthiopianPhone(phone);
      const userData = {
        name: name.trim() || undefined,
        phone: normalizedPhone,
        password,
      };

      const result = await register(userData);

      if (result.success) {
        setRegisteredPhone(normalizedPhone);
        setGeneratedRecoveryCode(result.recoveryCode || '');
        setCopiedRecoveryCode(false);
        setShowRecoveryModal(true);
      } else {
        const errorMsg = result.message || t('something_wrong');
        setGeneralError(errorMsg);
        Alert.alert(t('error'), errorMsg);
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.errors?.[0]?.msg ||
        (error.message?.includes('Network Error') || !error.response
          ? t('network_error')
          : t('something_wrong'));
      setGeneralError(errorMsg);
      Alert.alert(t('error'), errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (text) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setPhone(cleaned);
  };

  const handleCopyRecoveryCode = async () => {
    if (!generatedRecoveryCode) return;
    await copyToClipboard(generatedRecoveryCode);
    setCopiedRecoveryCode(true);
    Alert.alert(t('success') || 'Success', 'Recovery code copied to clipboard!');
    setTimeout(() => setCopiedRecoveryCode(false), 3000);
  };

  const handleDismissRecoveryModal = () => {
    setShowRecoveryModal(false);
    navigation.navigate('Login', {
      phone: registeredPhone,
      recoveryCode: generatedRecoveryCode,
    });
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
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-left" size={24} color={theme.dark ? '#FFFFFF' : '#333333'} />
          </TouchableOpacity>
          <LanguageToggle />
        </View>

        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Icon name="cash-multiple" size={48} color="#fff" />
          </View>
          <Text style={[styles.appName, isAmharic && styles.amharicFont]}>
            {t('app_name')}
          </Text>
          <Text style={[styles.tagline, { color: theme.dark ? '#AAAAAA' : '#666666' }, isAmharic && styles.amharicFont]}>
            {t('track_expenses_together')}
          </Text>
        </View>

        <View style={[styles.formContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.formTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }, isAmharic && styles.amharicFont]}>
            {t('register')}
          </Text>

          {/* Full Name Input (Optional) */}
          <TextInput
            label={isAmharic ? 'ሙሉ ስም (አማራጭ)' : 'Full Name (Optional)'}
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
            textColor={theme.dark ? '#FFFFFF' : '#333333'}
            outlineColor={theme.dark ? '#666666' : '#CCCCCC'}
            activeOutlineColor={theme.colors.primary}
            left={<TextInput.Icon icon="account" />}
            placeholder={isAmharic ? 'ለምሳሌ፡ አበበ ከበደ' : 'e.g. Abebe Kebede'}
            placeholderTextColor="#999"
          />
          <View style={styles.inputSpacing} />

          {/* Phone Input */}
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

          {/* Password Input */}
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

          {/* Confirm Password Input */}
          <TextInput
            label={t('confirm_password')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            style={[styles.input, { backgroundColor: theme.colors.surface }]}
            textColor={theme.dark ? '#FFFFFF' : '#333333'}
            outlineColor={theme.dark ? '#666666' : '#CCCCCC'}
            activeOutlineColor={theme.colors.primary}
            secureTextEntry={!showConfirmPassword}
            left={<TextInput.Icon icon="lock-check" />}
            right={
              <TextInput.Icon
                icon={showConfirmPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              />
            }
            error={!!errors.confirmPassword}
          />
          <HelperText type="error" visible={!!errors.confirmPassword}>
            {errors.confirmPassword}
          </HelperText>

          {/* Terms Agreement */}
          <TouchableOpacity
            style={styles.termsContainer}
            onPress={() => setAgreeTerms(!agreeTerms)}
            activeOpacity={0.7}
          >
            <Checkbox
              status={agreeTerms ? 'checked' : 'unchecked'}
              onPress={() => setAgreeTerms(!agreeTerms)}
              color={theme.colors.primary}
            />
            <Text style={[styles.termsText, isAmharic && styles.amharicFont]}>
              {t('agree_to_terms')}
              <Text style={styles.termsLink}> {t('terms_of_service')}</Text>
              {t('and')}
              <Text style={styles.termsLink}> {t('privacy_policy')}</Text>
            </Text>
          </TouchableOpacity>
          <HelperText type="error" visible={!!errors.agreeTerms}>
            {errors.agreeTerms}
          </HelperText>

          {/* Status / Error Banner */}
          {!!generalError && (
            <View style={styles.errorBanner}>
              <Icon name="alert-circle" size={20} color="#D32F2F" />
              <Text style={[styles.errorBannerText, isAmharic && styles.amharicFont]}>
                {generalError}
              </Text>
            </View>
          )}

          {/* Success Banner */}
          {!!successMsg && (
            <View style={styles.successBanner}>
              <Icon name="check-circle" size={20} color="#2E7D32" />
              <Text style={[styles.successBannerText, isAmharic && styles.amharicFont]}>
                {successMsg}
              </Text>
            </View>
          )}

          {/* Register Button */}
          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.registerButton}
            contentStyle={styles.buttonContent}
          >
            {t('register')}
          </Button>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, isAmharic && styles.amharicFont]}>
              {t('have_account')}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLink, isAmharic && styles.amharicFont]}>
                {t('login')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Recovery Code Dialog Modal */}
      <Modal
        visible={showRecoveryModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDismissRecoveryModal}
      >
        <View style={styles.recoveryModalOverlay}>
          <View style={[styles.recoveryModalCard, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.recoveryShieldCircle}>
              <Icon name="shield-key" size={36} color="#fff" />
            </View>

            <Text style={[styles.recoveryModalTitle, { color: theme.dark ? '#FFFFFF' : '#333333' }]}>
              {isAmharic ? 'የአካውንት ምዝገባ ተሳክቷል!' : 'Account Created Locally!'}
            </Text>

            <Text style={styles.recoveryModalSubtitle}>
              {t('recovery_code') || 'Recovery Code'}
            </Text>

            <Text style={[styles.recoveryModalDesc, { color: theme.dark ? '#BBBBBB' : '#666666' }]}>
              {t('recovery_code_desc') ||
                'Save this offline recovery code. You will need it to reset your password if you ever forget it.'}
            </Text>

            <View style={[styles.recoveryCodeBox, { backgroundColor: theme.dark ? '#1B2E1D' : '#E8F5E9', borderColor: '#4CAF50' }]}>
              <Text style={[styles.recoveryCodeText, { color: theme.dark ? '#81C784' : '#1B5E20' }]}>
                {generatedRecoveryCode}
              </Text>
            </View>

            <Button
              mode="outlined"
              icon={copiedRecoveryCode ? 'check' : 'content-copy'}
              onPress={handleCopyRecoveryCode}
              style={{ width: '100%', marginBottom: 12, borderRadius: 10 }}
            >
              {copiedRecoveryCode ? (t('copied') || 'Copied!') : (t('copy') || 'Copy Recovery Code')}
            </Button>

            <Button
              mode="contained"
              icon="arrow-right"
              onPress={handleDismissRecoveryModal}
              style={{ width: '100%', borderRadius: 10, backgroundColor: '#2E7D32' }}
            >
              {t('i_have_saved_code') || 'I Have Saved My Code — Continue'}
            </Button>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  backButton: {
    padding: 6,
    borderRadius: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      },
      default: {
        elevation: 4,
      },
    }),
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
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
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  input: {
    marginBottom: 4,
  },
  inputSpacing: {
    height: 10,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  termsLink: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    marginBottom: 6,
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
    padding: 12,
    marginTop: 12,
    marginBottom: 6,
    gap: 8,
  },
  successBannerText: {
    color: '#2E7D32',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  registerButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#666',
    fontSize: 14,
  },
  loginLink: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  recoveryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  recoveryModalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  recoveryShieldCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  recoveryModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  recoveryModalSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  recoveryModalDesc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  recoveryCodeBox: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginBottom: 16,
  },
  recoveryCodeText: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
  },
});

export default RegisterScreen;