import { Linking, Alert, Platform } from 'react-native';

export const PAYMENT_APPS = {
  TeleBirr: {
    name: 'Telebirr',
    schemes: ['telebirr://', 'ethiopay://'],
    androidPackage: 'cn.tydic.ethiopay',
    defaultUssd: '*127#',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=cn.tydic.ethiopay',
    appStoreUrl: 'https://apps.apple.com/app/telebirr/id1562211938'
  },
  'CBE Birr': {
    name: 'CBE Mobile Banking',
    schemes: ['cbe://', 'cbebirr://'],
    androidPackage: 'com.combanketh.mobilebanking',
    defaultUssd: '*847#',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.combanketh.mobilebanking',
    appStoreUrl: 'https://apps.apple.com/app/cbe-mobile-banking/id1453896574'
  },
  Amole: {
    name: 'Amole',
    schemes: ['amole://'],
    androidPackage: 'com.dashen.amole',
    defaultUssd: '*850#',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.dashen.amole',
    appStoreUrl: 'https://apps.apple.com/app/amole/id1436979354'
  }
};

/**
 * Dial USSD code directly using the device dialer
 * @param {string} ussdCode - e.g. *127*911223344*50#
 */
export const dialUssd = async (ussdCode) => {
  if (!ussdCode) return;
  try {
    const encoded = encodeURIComponent(ussdCode);
    await Linking.openURL(`tel:${encoded}`);
  } catch (error) {
    Alert.alert('Error', `Could not open dialer for ${ussdCode}`);
  }
};

/**
 * Open mobile banking app (Telebirr or CBE Mobile Banking) or fallback to USSD
 * @param {Object} option - Payment option object
 * @param {Function} onSettlementSuccess - Callback to record settlement
 */
export const activatePaymentMethod = async (option, onSettlementSuccess) => {
  const methodConfig = PAYMENT_APPS[option.method] || PAYMENT_APPS[option.appName];
  const ussdCode = option.ussdCode || methodConfig?.defaultUssd;

  if (!methodConfig) {
    // If not a known Ethiopian fintech app (e.g. Cash), prompt direct settlement
    if (onSettlementSuccess) onSettlementSuccess();
    return;
  }

  const { name, schemes, androidPackage, playStoreUrl, appStoreUrl } = methodConfig;
  const storeUrl = Platform.OS === 'ios' ? appStoreUrl : playStoreUrl;

  let opened = false;

  // 1. Try URL schemes supported by the app
  for (const scheme of schemes) {
    try {
      const supported = await Linking.canOpenURL(scheme);
      if (supported) {
        await Linking.openURL(scheme);
        opened = true;
        break;
      }
    } catch (e) {
      // Continue to next scheme or intent
    }
  }

  // 2. On Android, try launching via intent package if scheme check didn't open
  if (!opened && Platform.OS === 'android' && androidPackage) {
    const intentUrl = `intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=${androidPackage};end`;
    try {
      await Linking.openURL(intentUrl);
      opened = true;
    } catch (e) {
      opened = false;
    }
  }

  // 3. If app was activated, prompt user to confirm settlement upon return
  if (opened) {
    Alert.alert(
      `${name} Activated`,
      `We opened ${name} for you. After finishing your payment, would you like to record this settlement?`,
      [
        {
          text: 'Record Settlement',
          onPress: () => onSettlementSuccess && onSettlementSuccess()
        },
        {
          text: 'Dial USSD instead',
          onPress: () => dialUssd(ussdCode)
        },
        { text: 'Later', style: 'cancel' }
      ]
    );
    return;
  }

  // 4. Fallback if mobile app is not installed
  Alert.alert(
    `${name} App Not Found`,
    `Could not open ${name} directly. You can dial the USSD code (${ussdCode}) or install the app.`,
    [
      {
        text: `Dial USSD (${ussdCode})`,
        onPress: () => {
          dialUssd(ussdCode);
          if (onSettlementSuccess) {
            setTimeout(() => {
              Alert.alert('Confirm Settlement', 'Record this settlement in the group?', [
                { text: 'Yes', onPress: onSettlementSuccess },
                { text: 'Cancel', style: 'cancel' }
              ]);
            }, 1000);
          }
        }
      },
      {
        text: 'Get App',
        onPress: () => Linking.openURL(storeUrl)
      },
      {
        text: 'Record Manually',
        onPress: () => onSettlementSuccess && onSettlementSuccess()
      },
      { text: 'Cancel', style: 'cancel' }
    ]
  );
};
