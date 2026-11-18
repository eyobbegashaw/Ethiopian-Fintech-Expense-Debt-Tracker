import { queryOne, execute, withTransaction } from '../database/db';
import { generateId, generateSalt, hashPassword, verifyPassword, generateRecoveryCode } from '../database/security';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const authService = {
  /**
   * Local registration with salted hash and recovery code
   */
  register: async (userData) => {
    const { phone, name, email = '', password, avatar = null } = userData;

    if (!phone || !name || !password) {
      throw new Error('Name, phone number, and password are required');
    }

    // Check if phone already registered locally
    const existing = await queryOne('SELECT id FROM users WHERE phone = ?;', [phone]);
    if (existing) {
      throw new Error('An account with this phone number already exists on this device');
    }

    const userId = generateId();
    const salt = generateSalt(16);
    const passwordHash = await hashPassword(password, salt);
    const recoveryCode = generateRecoveryCode();
    const now = new Date().toISOString();

    await withTransaction(async () => {
      // 1. Insert into users
      await execute(
        `INSERT INTO users (id, phone, name, email, password_hash, salt, avatar, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
        [userId, phone, name, email, passwordHash, salt, avatar, now, now]
      );

      // 2. Insert into user_profiles
      await execute(
        `INSERT INTO user_profiles (user_id, display_name, phone, currency, calendar_preference, time_format, language, theme, biometric_enabled, recovery_code, avatar_url, updated_at)
         VALUES (?, ?, ?, 'ETB', 'ethiopian', '12h', 'am', 'system', 0, ?, ?, ?);`,
        [userId, name, phone, recoveryCode, avatar, now]
      );

      // 3. Insert into app_settings
      await execute(
        `INSERT INTO app_settings (id, user_id, offline_mode_strict, auto_lock_minutes, biometric_lock, language, calendar, time_format, theme, dark_mode, updated_at)
         VALUES (?, ?, 1, 5, 0, 'am', 'ethiopian', '12h', 'system', 0, ?);`,
        [generateId(), userId, now]
      );

      // 4. Insert into notification_settings
      await execute(
        `INSERT INTO notification_settings (id, user_id, upcoming_bills_enabled, budget_alerts_enabled, daily_reminder_enabled, reminder_time, updated_at)
         VALUES (?, ?, 1, 1, 0, '09:00', ?);`,
        [generateId(), userId, now]
      );

      // 5. Create starter financial accounts (Cash and CBE)
      const cashAccId = generateId();
      await execute(
        `INSERT INTO financial_accounts (id, user_id, name, type, institution, initial_balance, current_balance, currency, color, icon, is_default, created_at, updated_at)
         VALUES (?, ?, 'Pocket Cash', 'cash', 'Cash', 0, 0, 'ETB', '#2E7D32', 'cash', 1, ?, ?);`,
        [cashAccId, userId, now, now]
      );

      const cbeAccId = generateId();
      await execute(
        `INSERT INTO financial_accounts (id, user_id, name, type, institution, initial_balance, current_balance, currency, color, icon, is_default, created_at, updated_at)
         VALUES (?, ?, 'CBE Account', 'cbe', 'Commercial Bank of Ethiopia', 0, 0, 'ETB', '#6A1B9A', 'bank', 0, ?, ?);`,
        [cbeAccId, userId, now, now]
      );
    });

    const userObj = {
      _id: userId,
      id: userId,
      phone,
      name,
      email,
      avatar,
      settings: {
        currency: 'ETB',
        calendar: 'ethiopian',
        timeFormat: '12h',
        language: 'am',
        theme: 'system',
      },
      recoveryCode,
    };

    return {
      success: true,
      token: `local_jwt_${userId}`,
      user: userObj,
      recoveryCode,
    };
  },

  /**
   * Local login verifying password hash against salt
   */
  login: async (phone, password) => {
    if (!phone || !password) {
      throw new Error('Phone number and password are required');
    }

    const cleanDigits = phone.replace(/[^0-9]/g, '');
    let normalized = cleanDigits;
    if (cleanDigits.startsWith('251')) {
      normalized = '0' + cleanDigits.slice(3);
    } else if ((cleanDigits.startsWith('9') || cleanDigits.startsWith('7')) && cleanDigits.length === 9) {
      normalized = '0' + cleanDigits;
    }
    const withPlus = cleanDigits.startsWith('251') ? `+${cleanDigits}` : `+251${normalized.slice(1)}`;
    const withoutZero = normalized.startsWith('0') ? normalized.slice(1) : normalized;

    // Check across phone variations
    let userRow = await queryOne(
      'SELECT * FROM users WHERE (phone = ? OR phone = ? OR phone = ? OR phone = ?) AND (is_active = 1 OR is_active IS NULL OR is_active != 0);',
      [phone, normalized, withPlus, withoutZero]
    );

    // Fallback search if formatted differently
    if (!userRow) {
      userRow = await queryOne('SELECT * FROM users WHERE phone LIKE ?;', [`%${withoutZero}%`]);
    }

    if (!userRow) {
      throw new Error('Invalid phone number or password');
    }

    const isValid = await verifyPassword(password, userRow.salt, userRow.password_hash);
    if (!isValid) {
      throw new Error('Invalid phone number or password');
    }

    const profile = await queryOne('SELECT * FROM user_profiles WHERE user_id = ?;', [userRow.id]);

    const userObj = {
      _id: userRow.id,
      id: userRow.id,
      phone: userRow.phone,
      name: userRow.name,
      email: userRow.email,
      avatar: userRow.avatar || profile?.avatar_url,
      settings: {
        currency: profile?.currency || 'ETB',
        calendar: profile?.calendar_preference || 'ethiopian',
        timeFormat: profile?.time_format || '12h',
        language: profile?.language || 'am',
        theme: profile?.theme || 'system',
        biometricEnabled: Boolean(profile?.biometric_enabled),
      },
      recoveryCode: profile?.recovery_code,
    };

    return {
      success: true,
      token: `local_jwt_${userRow.id}`,
      user: userObj,
    };
  },

  /**
   * Get current authenticated user details from local database
   */
  getMe: async () => {
    const storedUserStr = await AsyncStorage.getItem('user');
    if (!storedUserStr) throw new Error('Not authenticated');

    const storedUser = JSON.parse(storedUserStr);
    const userId = storedUser._id || storedUser.id;

    const userRow = await queryOne('SELECT * FROM users WHERE id = ?;', [userId]);
    if (!userRow) throw new Error('User not found');

    const profile = await queryOne('SELECT * FROM user_profiles WHERE user_id = ?;', [userId]);

    const userObj = {
      _id: userRow.id,
      id: userRow.id,
      phone: userRow.phone,
      name: userRow.name,
      email: userRow.email,
      avatar: userRow.avatar || profile?.avatar_url,
      settings: {
        currency: profile?.currency || 'ETB',
        calendar: profile?.calendar_preference || 'ethiopian',
        timeFormat: profile?.time_format || '12h',
        language: profile?.language || 'am',
        theme: profile?.theme || 'system',
        biometricEnabled: Boolean(profile?.biometric_enabled),
      },
      recoveryCode: profile?.recovery_code,
    };

    return {
      success: true,
      data: userObj,
      user: userObj,
    };
  },

  /**
   * Change user password locally
   */
  changePassword: async (currentPassword, newPassword) => {
    const meRes = await authService.getMe();
    const user = meRes.data;

    const userRow = await queryOne('SELECT * FROM users WHERE id = ?;', [user.id]);
    const isValid = await verifyPassword(currentPassword, userRow.salt, userRow.password_hash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    const newSalt = generateSalt(16);
    const newHash = await hashPassword(newPassword, newSalt);
    const now = new Date().toISOString();

    await execute(
      'UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?;',
      [newHash, newSalt, now, user.id]
    );

    return { success: true, message: 'Password updated successfully' };
  },

  /**
   * Local phone verification for offline recovery
   */
  verifyPhone: async (phone) => {
    const userRow = await queryOne('SELECT id, name, phone FROM users WHERE phone = ?;', [phone]);
    if (!userRow) {
      throw new Error('No account found with this phone number on this device');
    }
    return { success: true, user: userRow };
  },

  /**
   * Reset password for verified local device user
   */
  resetPassword: async ({ phone, newPassword }) => {
    const userRow = await queryOne('SELECT id FROM users WHERE phone = ?;', [phone]);
    if (!userRow) {
      throw new Error('User not found on this device');
    }
    const newSalt = generateSalt(16);
    const newHash = await hashPassword(newPassword, newSalt);
    const now = new Date().toISOString();

    await execute(
      'UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?;',
      [newHash, newSalt, now, userRow.id]
    );

    return { success: true, message: 'Password reset successfully' };
  },

  /**
   * Local password recovery using the unique recovery code
   */
  recoverPassword: async (phone, recoveryCode, newPassword) => {
    const userRow = await queryOne('SELECT * FROM users WHERE phone = ?;', [phone]);
    if (!userRow) {
      throw new Error('No user found with this phone number');
    }

    const profile = await queryOne('SELECT * FROM user_profiles WHERE user_id = ?;', [userRow.id]);
    if (!profile || profile.recovery_code !== recoveryCode.trim().toUpperCase()) {
      throw new Error('Invalid recovery code');
    }

    const newSalt = generateSalt(16);
    const newHash = await hashPassword(newPassword, newSalt);
    const now = new Date().toISOString();

    await execute(
      'UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?;',
      [newHash, newSalt, now, userRow.id]
    );

    return { success: true, message: 'Password reset successfully' };
  },

  /**
   * Update profile (name, email, avatar, etc.) and optional settings
   */
  updateProfile: async (profileData) => {
    const meRes = await authService.getMe();
    const user = meRes.data;
    const now = new Date().toISOString();

    const { name, email, avatar, settings } = profileData;

    if (name !== undefined || email !== undefined || avatar !== undefined) {
      await execute(
        'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), avatar = COALESCE(?, avatar), updated_at = ? WHERE id = ?;',
        [name !== undefined ? name : null, email !== undefined ? email : null, avatar !== undefined ? avatar : null, now, user.id]
      );

      await execute(
        'UPDATE user_profiles SET display_name = COALESCE(?, display_name), avatar_url = COALESCE(?, avatar_url), updated_at = ? WHERE user_id = ?;',
        [name !== undefined ? name : null, avatar !== undefined ? avatar : null, now, user.id]
      );
    }

    if (settings) {
      await authService.updateSettings(settings);
    }

    const updated = await authService.getMe();
    await AsyncStorage.setItem('user', JSON.stringify(updated.data));
    return updated;
  },

  /**
   * Update settings (calendar, timeFormat, currency, language, theme)
   */
  updateSettings: async (settings) => {
    const meRes = await authService.getMe();
    const user = meRes.data;
    const now = new Date().toISOString();

    const { calendar, timeFormat, currency, language, theme, biometricEnabled } = settings;

    await execute(
      `UPDATE user_profiles SET 
        calendar_preference = COALESCE(?, calendar_preference),
        time_format = COALESCE(?, time_format),
        currency = COALESCE(?, currency),
        language = COALESCE(?, language),
        theme = COALESCE(?, theme),
        biometric_enabled = COALESCE(?, biometric_enabled),
        updated_at = ?
       WHERE user_id = ?;`,
      [
        calendar,
        timeFormat,
        currency,
        language,
        theme,
        biometricEnabled !== undefined ? (biometricEnabled ? 1 : 0) : null,
        now,
        user.id,
      ]
    );

    const updated = await authService.getMe();
    await AsyncStorage.setItem('user', JSON.stringify(updated.data));
    return updated;
  },
};

export default authService;
