import { Alert, Platform } from 'react-native';
import FontFaceObserver from 'fontfaceobserver';

// Only run in browser environment
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // 1. Ensure window.FontFaceObserver is available
  window.FontFaceObserver = FontFaceObserver;

  // 2. Patch FontFaceObserver.prototype.load
  // FontFaceObserver has a known bug where its internal Promise.race creates an unhandled rejection
  // if font loading times out after 6000ms, especially for icon fonts (which don't contain Latin characters).
  // On web, Expo already injects the @font-face CSS rule; the browser loads it natively.
  // Replacing load() with document.fonts.ready avoids the broken 6000ms timer completely.
  if (FontFaceObserver && FontFaceObserver.prototype) {
    FontFaceObserver.prototype.load = function () {
      if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
        return document.fonts.ready.then(() => this).catch(() => this);
      }
      return Promise.resolve(this);
    };
  }

  // 3. Patch Alert.alert for react-native-web
  // react-native-web implements Alert.alert as a no-op: `static alert() {}`
  // This causes all Alert calls on web to fail silently with no UI feedback and no callbacks triggered.
  if (Alert) {
    Alert.alert = (title, message, buttons) => {
      const text = [title, message].filter(Boolean).join('\n\n');
      if (buttons && buttons.length > 1) {
        const confirmed = window.confirm(text);
        if (confirmed) {
          const okBtn = buttons.find((b) => b.style !== 'cancel') || buttons[buttons.length - 1];
          okBtn?.onPress?.();
        } else {
          const cancelBtn = buttons.find((b) => b.style === 'cancel');
          cancelBtn?.onPress?.();
        }
      } else {
        if (text) {
          window.alert(text);
        }
        if (buttons && buttons[0]?.onPress) {
          buttons[0].onPress();
        }
      }
    };
  }

  // 4. Prevent any unhandled promise rejections related to font timeouts from crashing the web app
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason?.message || String(reason || '');
    if (message.includes('timeout exceeded')) {
      event.preventDefault();
      event.stopPropagation?.();
    }
  });

  // 5. Prevent uncaught global errors for font timeout
  window.addEventListener('error', (event) => {
    const message = event.message || event.error?.message || '';
    if (typeof message === 'string' && message.includes('timeout exceeded')) {
      event.preventDefault();
      event.stopPropagation?.();
    }
  });
}
