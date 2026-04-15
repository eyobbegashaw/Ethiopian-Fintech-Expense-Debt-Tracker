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
} from 'react-native';
import {
  TextInput,
  Button,
  useTheme,
  ActivityIndicator,
  HelperText,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../translations';
import { authService } from '../services/authService';

const ForgotPasswordScreen = ({ navigation }) => {
  const theme = useTheme();
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [resendTimer, setResendTimer] = useState(0);

  const validatePhone = () => {
    const phoneRegex = /^[0-9]{9,12}$/;
    if (!phone) {
      setErrors({ ...errors, phone: i18n.t('phone_required') });
      return false;
    }
    if (!phoneRegex.test(phone)) {
      setErrors({ ...errors, phone: i18n.t('invalid_phone') });
      return false;
    }
    setErrors({ ...errors, phone: null });
    return true;
  };

  const validateOtp = () => {
    if (!otp || otp.length < 4) {
      setErrors({ ...errors, otp: i18n.t('otp_required') });
      return false;
    }
    setErrors({ ...errors, otp: null });
    return true;
  };

  const validatePassword = () => {
    if (!newPassword) {
      setErrors({ ...errors, newPassword: i18n.t('password_required') });
      return false;
    }
    if (newPassword.length < 6) {
      setErrors({ ...errors, newPassword: i18n.t('password_min_length') });
      return false;
    }
    if (newPassword !== confirmPassword) {
      setErrors({ ...errors, confirmPassword: i18n.t('passwords_do_not_match') });
      return false;
    }
    setErrors({ ...errors, newPassword: null, confirmPassword: null });
    return true;
  };

  const handleSendOtp = async () => {
    if (!validatePhone()) return;
    
    try {
      setLoading(true);
      await authService.forgotPassword(phone);
      Alert.alert(i18n.t('success'), i18n.t('otp_sent_success'));
      setStep(2);
      startResendTimer();
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!validateOtp()) return;
    setStep(3);
  };

  const handleResetPassword = async () => {
    if (!validatePassword()) return;
    
    try {
      setLoading(true);
      await authService.resetPassword(otp, newPassword);
      Alert.alert(
        i18n.t('success'), 
        i18n.t('password_reset_success'),
        [{ text: i18n.t('login'), onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    } finally {
      setLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    await handleSendOtp();
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Icon name="cellphone" size={64} color={theme.colors.primary} style={styles.stepIcon} />
      <Text style={styles.stepTitle}>{i18n.t('reset_password')}</Text>
      <Text style={styles.stepDescription}>
        {i18n.t('forgot_password_description')}
      </Text>
      
      <TextInput
        label={i18n.t('phone_number')}
        value={phone}
        onChangeText={setPhone}
        mode="outlined"
        style={styles.input}
        keyboardType="phone-pad"
        left={<TextInput.Icon icon="cellphone" />}
        error={!!errors.phone}
      />
      <HelperText type="error" visible={!!errors.phone}>
        {errors.phone}
      </HelperText>
      
      <Button
        mode="contained"
        onPress={handleSendOtp}
        loading={loading}
        disabled={loading}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        {i18n.t('send_otp')}
      </Button>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Icon name="shield-check" size={64} color={theme.colors.primary} style={styles.stepIcon} />
      <Text style={styles.stepTitle}>{i18n.t('verify_otp')}</Text>
      <Text style={styles.stepDescription}>
        {i18n.t('otp_sent_to')} {phone}
      </Text>
      
      <TextInput
        label={i18n.t('verification_code')}
        value={otp}
        onChangeText={setOtp}
        mode="outlined"
        style={styles.input}
        keyboardType="number-pad"
        left={<TextInput.Icon icon="shield-key" />}
        error={!!errors.otp}
      />
      <HelperText type="error" visible={!!errors.otp}>
        {errors.otp}
      </HelperText>
      
      <TouchableOpacity 
        onPress={handleResendOtp} 
        disabled={resendTimer > 0}
        style={styles.resendContainer}
      >
        <Text style={[styles.resendText, resendTimer > 0 && styles.resendDisabled]}>
          {resendTimer > 0 
            ? `${i18n.t('resend_code_in')} ${resendTimer}s`
            : i18n.t('resend_code')}
        </Text>
      </TouchableOpacity>
      
      <Button
        mode="contained"
        onPress={handleVerifyOtp}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        {i18n.t('verify')}
      </Button>
      
      <Button
        mode="text"
        onPress={() => setStep(1)}
        style={styles.backButton}
      >
        {i18n.t('back')}
      </Button>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Icon name="lock-reset" size={64} color={theme.colors.primary} style={styles.stepIcon} />
      <Text style={styles.stepTitle}>{i18n.t('create_new_password')}</Text>
      <Text style={styles.stepDescription}>
        {i18n.t('enter_new_password')}
      </Text>
      
      <TextInput
        label={i18n.t('new_password')}
        value={newPassword}
        onChangeText={setNewPassword}
        mode="outlined"
        style={styles.input}
        secureTextEntry
        left={<TextInput.Icon icon="lock" />}
        error={!!errors.newPassword}
      />
      <HelperText type="error" visible={!!errors.newPassword}>
        {errors.newPassword}
      </HelperText>
      
      <TextInput
        label={i18n.t('confirm_password')}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        mode="outlined"
        style={styles.input}
        secureTextEntry
        left={<TextInput.Icon icon="lock-check" />}
        error={!!errors.confirmPassword}
      />
      <HelperText type="error" visible={!!errors.confirmPassword}>
        {errors.confirmPassword}
      </HelperText>
      
      <Button
        mode="contained"
        onPress={handleResetPassword}
        loading={loading}
        disabled={loading}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        {i18n.t('reset_password')}
      </Button>
      
      <Button
        mode="text"
        onPress={() => navigation.navigate('Login')}
        style={styles.backButton}
      >
        {i18n.t('back_to_login')}
      </Button>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Icon name="cash-multiple" size={48} color="#fff" />
          </View>
          <Text style={styles.appName}>{i18n.t('app_name')}</Text>
        </View>
        
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
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
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  stepContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  stepIcon: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 16,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  backButton: {
    marginTop: 12,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#2E7D32',
  },
  resendDisabled: {
    color: '#999',
  },
});

export default ForgotPasswordScreen;
