import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,   
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../translations';

const { width, height } = Dimensions.get('window');

const SplashScreen = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Parallel animations for a beautiful entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: false,
      }),
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ),
    ]).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
      
      <View style={styles.backgroundPattern}>
        {[...Array(6)].map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.circle,
              {
                width: 100 + i * 30,
                height: 100 + i * 30,
                opacity: 0.1 - i * 0.015,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          />
        ))}
      </View>
      
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: translateYAnim }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: scaleAnim }, { rotate: spin }],
            },
          ]}
        >
          <Icon name="cash-multiple" size={80} color="#fff" />
        </Animated.View>
        
        <Animated.Text style={[styles.appName, { opacity: fadeAnim }]}>
          {i18n.t('app_name')}
        </Animated.Text>
        
        <Animated.Text style={[styles.tagline, { opacity: fadeAnim }]}>
          {i18n.t('track_expenses_together')}
        </Animated.Text>
        
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBar}>
            <Animated.View
              style={[
                styles.loadingProgress,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.loadingText}>{i18n.t('loading')}</Text>
        </View>
      </Animated.View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2024 Ethio Debt Tracker</Text>
        <Text style={styles.footerSubText}>{i18n.t('version')} 1.0.0</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundPattern: {
    position: 'absolute',
    width: width,
    height: height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#fff',
    opacity: 0.1,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 40,
  },
  loadingContainer: {
    width: width - 80,
    marginTop: 20,
  },
  loadingBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgress: {
    height: '100%',
    backgroundColor: '#FFC107',
    borderRadius: 2,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  footerSubText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 4,
  },
});

export default SplashScreen;
