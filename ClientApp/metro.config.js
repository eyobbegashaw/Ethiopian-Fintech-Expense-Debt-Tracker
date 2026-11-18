const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Enable .wasm files as assets for expo-sqlite web support
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// Add headers required for SharedArrayBuffer / OPFS in web workers
config.server = config.server || {};
const originalEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const enhanced = originalEnhanceMiddleware
    ? originalEnhanceMiddleware(middleware, server)
    : middleware;

  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');

    // SPA fallback: rewrite HTML navigations (e.g. /Main, /Auth) to / so Metro serves index.html
    const acceptHeader = req.headers?.accept || '';
    const isHtmlRequest = acceptHeader.includes('text/html') || (!pathHasExtension(req.url) && !isInternalEndpoint(req.url));
    if (req.method === 'GET' && isHtmlRequest && !isInternalEndpoint(req.url) && req.url !== '/') {
      req.url = '/';
    }

    return enhanced(req, res, next);
  };
};

function pathHasExtension(url) {
  if (!url) return false;
  const pathname = url.split('?')[0];
  const lastSegment = pathname.split('/').pop();
  return lastSegment.includes('.');
}

function isInternalEndpoint(url) {
  if (!url) return false;
  return (
    url.startsWith('/_expo') ||
    url.startsWith('/assets') ||
    url.startsWith('/symbolicate') ||
    url.startsWith('/open-stack-frame') ||
    url.startsWith('/status')
  );
}

module.exports = config;
