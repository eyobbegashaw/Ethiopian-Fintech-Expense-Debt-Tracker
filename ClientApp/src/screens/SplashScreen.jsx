import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguage } from '../contexts/LanguageContext';

const { width } = Dimensions.get('window');

const SplashScreen = () => {
  let isAmharic = true;
  try {
    const lang = useLanguage();
    isAmharic = lang?.isAmharic ?? true;
  } catch (_e) {
    isAmharic = true;
  }

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const translateYAnim = useRef(new Animated.Value(30)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [statusIndex, setStatusIndex] = useState(0);

  const statusMessages = isAmharic
    ? [
        'ደህንነቱ የተጠበቀ ቮልት በማዘጋጀት ላይ...',
        'የሂሳብ እና የዕዳ መረጃዎችን በማመሳሰል ላይ...',
        'እንኳን ወደ እልፍ በደህና መጡ...',
      ]
    : [
        'Securing your financial vault...',
        'Syncing shared balances & ledgers...',
        'Welcome to Ilf Fintech...',
      ];

  useEffect(() => {
    const isNative = Platform.OS !== 'web';

    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: isNative,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 45,
        useNativeDriver: isNative,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: isNative,
      }),
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: false,
      }),
    ]).start();

    // Continuous ambient rotation
    const rotationLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 12000,
        useNativeDriver: isNative,
      })
    );
    rotationLoop.start();

    // Continuous pulse ripple
    const pulseLoop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 2400,
        useNativeDriver: isNative,
      })
    );
    pulseLoop.start();

    // Breathing glow animation
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.85,
          duration: 1400,
          useNativeDriver: isNative,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.35,
          duration: 1400,
          useNativeDriver: isNative,
        }),
      ])
    );
    glowLoop.start();

    // Rotate status messages smoothly
    const interval1 = setTimeout(() => setStatusIndex(1), 800);
    const interval2 = setTimeout(() => setStatusIndex(2), 1600);

    return () => {
      rotationLoop.stop();
      pulseLoop.stop();
      glowLoop.stop();
      clearTimeout(interval1);
      clearTimeout(interval2);
    };
  }, [fadeAnim, scaleAnim, translateYAnim, progressAnim, rotateAnim, pulseAnim, glowAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const pulseScale1 = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.7],
  });

  const pulseOpacity1 = pulseAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.55, 0.2, 0],
  });

  const pulseScale2 = pulseAnim.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0.9, 1.3, 2.1],
  });

  const pulseOpacity2 = pulseAnim.interpolate({
    inputRange: [0, 0.3, 0.7, 1],
    outputRange: [0, 0.4, 0.15, 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#061B0E" />

      {/* Ambient luxury emerald & golden glow layers */}
      <View style={styles.ambientBackground}>
        <Animated.View style={[styles.glowOrbTopLeft, { opacity: glowAnim }]} />
        <Animated.View style={[styles.glowOrbBottomRight, { opacity: glowAnim }]} />
        <View style={styles.radialBackdrop} />
      </View>

      {/* Main Center Content */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: translateYAnim }],
          },
        ]}
      >
        {/* Emblem Presentation */}
        <View style={styles.emblemContainer}>
          {/* Outer Ripple Wave 1 */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseScale1 }],
                opacity: pulseOpacity1,
              },
            ]}
          />

          {/* Outer Ripple Wave 2 */}
          <Animated.View
            style={[
              styles.pulseRing,
              styles.pulseRingSecondary,
              {
                transform: [{ scale: pulseScale2 }],
                opacity: pulseOpacity2,
              },
            ]}
          />

          {/* Rotating Celestial Accents */}
          <Animated.View
            style={[
              styles.rotatingBorderRing,
              {
                transform: [{ rotate: spin }],
              },
            ]}
          >
            <View style={styles.orbitOrb} />
            <View style={styles.orbitOrbOpposite} />
          </Animated.View>

          {/* Core Glassmorphic Shield & Emblem */}
          <Animated.View
            style={[
              styles.coreBadge,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.badgeInner}>
              {/* Ge'ez Primary Glyph: እ */}
              <Text style={styles.badgeGlyph}>እ</Text>
              <View style={styles.sparkleBadge}>
                <Icon name="star-four-points" size={13} color="#FFD700" />
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Brand Name & Identity */}
        <View style={styles.brandContainer}>
          <Text style={styles.brandName}>እልፍ</Text>
          <View style={styles.subtitleRow}>
            <View style={styles.subLine} />
            <Text style={styles.brandSubtitle}>ILF FINTECH</Text>
            <View style={styles.subLine} />
          </View>
          <Text style={styles.tagline}>
            {isAmharic
              ? 'ዘመናዊ የጋራ ወጪ እና የፋይናንስ መከታተያ'
              : 'Smart Expense & Debt Management'}
          </Text>
        </View>

        {/* Modern Fintech Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressBarTrack}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
            <Animated.View
              style={[
                styles.shimmerDot,
                {
                  left: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['-5%', '96%'],
                  }),
                },
              ]}
            />
          </View>

          {/* Animated Status Message */}
          <Text style={styles.statusMessage}>{statusMessages[statusIndex]}</Text>
        </View>
      </Animated.View>

      {/* Footer Security & Attribution */}
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <View style={styles.securityPill}>
          <Icon name="shield-check" size={14} color="#00E676" style={styles.securityIcon} />
          <Text style={styles.securityText}>
            {isAmharic ? 'በከፍተኛ ምስጠራ የተጠበቀ • 256-Bit Secure' : 'Bank-Grade Security • 256-Bit Encrypted'}
          </Text>
        </View>

        <View style={styles.flagAccentRow}>
          <View style={[styles.flagDot, { backgroundColor: '#009A44' }]} />
          <View style={[styles.flagDot, { backgroundColor: '#FFD700' }]} />
          <View style={[styles.flagDot, { backgroundColor: '#EF3340' }]} />
          <Text style={styles.versionText}>እልፍ • Version 1.0.0</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#061B0E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ambientBackground: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  radialBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 27, 14, 0.88)',
  },
  glowOrbTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#1B5E20',
  },
  glowOrbBottomRight: {
    position: 'absolute',
    bottom: -100,
    right: -80,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: '#004D40',
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  emblemContainer: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: '#00E676',
  },
  pulseRingSecondary: {
    borderColor: '#FFD700',
  },
  rotatingBorderRing: {
    position: 'absolute',
    width: 154,
    height: 154,
    borderRadius: 77,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.25)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbitOrb: {
    position: 'absolute',
    top: -4,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#FFD700',
    ...Platform.select({
      web: {
        boxShadow: '0 0 8px #FFD700',
      },
      default: {},
    }),
  },
  orbitOrbOpposite: {
    position: 'absolute',
    bottom: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  coreBadge: {
    width: 114,
    height: 114,
    borderRadius: 57,
    backgroundColor: 'rgba(27, 94, 32, 0.65)',
    borderWidth: 2.5,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 32px rgba(0, 230, 118, 0.25), inset 0 0 16px rgba(255, 215, 0, 0.2)',
        backdropFilter: 'blur(10px)',
      },
      default: {
        elevation: 10,
      },
    }),
  },
  badgeInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#0A3319',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  badgeGlyph: {
    fontSize: 54,
    fontWeight: 'bold',
    color: '#FFD700',
    fontFamily: 'Noto Serif Ethiopic, serif',
    textAlign: 'center',
    marginTop: -4,
    ...Platform.select({
      web: {
        textShadow: '0 2px 10px rgba(255, 215, 0, 0.5)',
      },
      default: {},
    }),
  },
  sparkleBadge: {
    position: 'absolute',
    top: 8,
    right: 12,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  brandName: {
    fontSize: 52,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: 'Noto Serif Ethiopic, serif',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 4,
    ...Platform.select({
      web: {
        textShadow: '0 4px 18px rgba(0, 230, 118, 0.35)',
      },
      default: {},
    }),
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  subLine: {
    width: 28,
    height: 1.5,
    backgroundColor: '#FFD700',
    opacity: 0.7,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 5,
    color: '#FFD700',
    marginHorizontal: 10,
  },
  tagline: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'Noto Serif Ethiopic, serif',
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 20,
  },
  progressSection: {
    width: Math.min(width - 64, 320),
    alignItems: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'visible',
    position: 'relative',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#00E676',
    ...Platform.select({
      web: {
        boxShadow: '0 0 10px #00E676',
      },
      default: {},
    }),
  },
  shimmerDot: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFD700',
    ...Platform.select({
      web: {
        boxShadow: '0 0 10px #FFD700',
      },
      default: {},
    }),
  },
  statusMessage: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.75)',
    fontFamily: 'Noto Serif Ethiopic, serif',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  footer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 44 : 26,
    alignItems: 'center',
    zIndex: 10,
  },
  securityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.25)',
  },
  securityIcon: {
    marginRight: 6,
  },
  securityText: {
    fontSize: 11,
    color: '#00E676',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  flagAccentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  versionText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.45)',
    fontFamily: 'Noto Serif Ethiopic, serif',
    marginLeft: 3,
  },
});

export default SplashScreen;
