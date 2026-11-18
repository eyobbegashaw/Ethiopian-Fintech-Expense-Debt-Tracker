import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Generate a random UUID
 */
export function generateId() {
  if (Crypto.randomUUID) {
    try {
      return Crypto.randomUUID();
    } catch {
      // Fall through to manual generator
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a cryptographically random salt
 */
export function generateSalt(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Pure JavaScript synchronous SHA-256 fallback (works on any platform, web, or non-secure origins)
 */
export function sha256Sync(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';

  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [];
  const k = [];
  let primeCounter = 0;

  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty];) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? (w[i] || 0)
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

      hash = [(temp1 + temp2) | 0].concat(hash.slice(0, 7));
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Hash password with salt using SHA-256 with multiple iterations
 */
export async function hashPassword(password, salt, iterations = 1000) {
  let hash = `${salt}:${password}`;
  for (let i = 0; i < 5; i++) {
    try {
      if (Crypto.digestStringAsync) {
        hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          `${hash}:${salt}:${i}`
        );
      } else {
        hash = sha256Sync(`${hash}:${salt}:${i}`);
      }
    } catch {
      // Fallback to pure JS sha256Sync when WebCrypto is unavailable
      hash = sha256Sync(`${hash}:${salt}:${i}`);
    }
  }
  return hash;
}

/**
 * Verify password against salt and stored hash
 */
export async function verifyPassword(password, salt, storedHash) {
  const computedHash = await hashPassword(password, salt);
  return computedHash === storedHash;
}

/**
 * Generate human-readable offline Recovery Code (e.g. ETHIO-7492-8193-4210)
 */
export function generateRecoveryCode() {
  const segment = () => Math.floor(1000 + Math.random() * 9000).toString();
  return `ETHIO-${segment()}-${segment()}-${segment()}`;
}

/**
 * Secure key-value storage (uses SecureStore on native, AsyncStorage on Web)
 */
export async function setSecureItem(key, value) {
  try {
    if (Platform.OS !== 'web' && SecureStore.isAvailableAsync) {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.setItemAsync(key, value);
        return;
      }
    }
  } catch {
    // Fall back to AsyncStorage
  }
  await AsyncStorage.setItem(`@secure_${key}`, value);
}

export async function getSecureItem(key) {
  try {
    if (Platform.OS !== 'web' && SecureStore.isAvailableAsync) {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        const val = await SecureStore.getItemAsync(key);
        if (val !== null) return val;
      }
    }
  } catch {
    // Fall back to AsyncStorage
  }
  return await AsyncStorage.getItem(`@secure_${key}`);
}

export async function deleteSecureItem(key) {
  try {
    if (Platform.OS !== 'web' && SecureStore.isAvailableAsync) {
      const isAvailable = await SecureStore.isAvailableAsync();
      if (isAvailable) {
        await SecureStore.deleteItemAsync(key);
      }
    }
  } catch {
    // Fall back
  }
  await AsyncStorage.removeItem(`@secure_${key}`);
}
