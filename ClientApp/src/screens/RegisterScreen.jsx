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
  Checkbox,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../translations';
import { authService } from '../services/authService';

const RegisterScreen = ({ navigation }) => {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!name.trim()) {
      newErrors.name = i18n.t('name_required');
    } else if (name.length < 2) {
      newErrors.name = i18n.t('name_min_length');
    }
    
    const phoneRegex = /^[0-9]{9,12}$/;
    if (!phone) {
      newErrors.phone = i18n.t('phone_required');
    } else if (!phoneRegex.test(phone)) {
      newErrors.phone = i18n.t('invalid_phone');
    }
    
    if (email && !/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = i18n.t('invalid_email');
    }
    
    if (!password) {
      newErrors.password = i18n.t('password_required');
    } else if (password.length < 6) {
      newErrors.password = i18n.t('password_min_length');
    }
    
    if (password !== confirmPassword) {
      newErrors.confirmPassword = i18n.t('passwords_do_not_match');
    }
    
    if (!agreeTerms) {
      newErrors.agreeTerms = i18n.t('agree_terms_required');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      const userData = {
        name: name.trim(),
        phone,
        email: email.trim() || undefined,
        password,
      };
      await authService.register(userData);
      Alert.alert(
        i18n.t('success'), 
        i18n.t('registration_success'),
        [{ text: i18n.t('login'), onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert(i18n.t('error'), error.response?.data?.message || i18n.t('something_wrong'));
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.tagline}>{i18n.t('track_expenses_together')}</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>{i18n.t('create_account')}</Text>
          
          <TextInput
            label={i18n.t('full_name')}
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="account" />}
            error={!!errors.name}
          />
          <HelperText type="error" visible={!!errors.name}>
            {errors.name}
          </HelperText>
          
          <TextInput
            label={i18n.t('phone_number')}
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="cellphone" />}
            error={!!errors.phone}
            placeholder="0912345678"
          />
          <HelperText type="error" visible={!!errors.phone}>
            {errors.phone}
          </HelperText>
          
          <TextInput
            label={i18n.t('email_optional')}
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            left={<TextInput.Icon icon="email" />}
            error={!!errors.email}
          />
          <HelperText type="error" visible={!!errors.email}>
            {errors.email}
          </HelperText>
          
          <TextInput
            label={i18n.t('password')}
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry
            left={<TextInput.Icon icon="lock" />}
            error={!!errors.password}
          />
          <HelperText type="error" visible={!!errors.password}>
            {errors.password}
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
          
          <View style={styles.termsContainer}>
            <Checkbox
              status={agreeTerms ? 'checked' : 'unchecked'}
              onPress={() => setAgreeTerms(!agreeTerms)}
              color={theme.colors.primary}
            />
            <Text style={styles.termsText}>
              {i18n.t('agree_to_terms')}
              <Text style={styles.termsLink} onPress={() => {}}> {i18n.t('terms_of_service')}</Text>
              {i18n.t('and')}
              <Text style={styles.termsLink} onPress={() => {}}> {i18n.t('privacy_policy')}</Text>
            </Text>
          </View>
          <HelperText type="error" visible={!!errors.agreeTerms}>
            {errors.agreeTerms}
          </HelperText>
          
          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.registerButton}
            contentStyle={styles.buttonContent}
          >
            {i18n.t('register')}
          </Button>
          
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>{i18n.t('have_account')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>{i18n.t('login')}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    marginTop: 20,
    marginBottom: 30,
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
  tagline: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  termsText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  termsLink: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  registerButton: {
    marginTop: 16,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  loginText: {
    fontSize: 14,
    color: '#666',
  },
  loginLink: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
});

export default RegisterScreen;
