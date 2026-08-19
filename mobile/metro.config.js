const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

// 1. Prvo dohvatimo osnovnu konfiguraciju
const defaultConfig = getDefaultConfig(__dirname);

// 2. Spremimo originalni resolver od Expo-a (ako ga ima)
const originalResolveRequest = defaultConfig.resolver.resolveRequest;

// 3. Definiramo naše putanje
const reanimatedPkg = path.resolve(__dirname, 'node_modules/react-native-reanimated');
const workletsPkg = path.resolve(__dirname, 'node_modules/react-native-worklets');
const reanimatedShimFile = path.resolve(__dirname, 'shims/react-native-reanimated.expo-go.js');
const workletsShimFile = path.resolve(__dirname, 'shims/react-native-worklets.expo-go.js');

const isEasBuild = process.env.EAS_BUILD === 'true';
const isDevClient = process.argv.includes('--dev-client');
const useExpoGoShims = !isEasBuild && !isDevClient;

// 4. Implementiramo naš custom resolver
defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  // A) Presretanje pokvarenih apsolutnih putanja iz react-native-css
  if (moduleName.includes('eas-build-local-nodejs') && moduleName.includes('react-native-reanimated')) {
    return { type: 'sourceFile', filePath: reanimatedPkg };
  }

  // B) Logika za shims (Reanimated / Worklets)
  if (moduleName === 'react-native-reanimated' || moduleName.startsWith('react-native-reanimated/')) {
    const targetPath = useExpoGoShims ? reanimatedShimFile : reanimatedPkg;
    return { type: 'sourceFile', filePath: targetPath };
  }

  if (moduleName === 'react-native-worklets' || moduleName.startsWith('react-native-worklets/')) {
    const targetPath = useExpoGoShims ? workletsShimFile : workletsPkg;
    return { type: 'sourceFile', filePath: targetPath };
  }

  // C) PROSLJEĐIVANJE: Pozivamo originalni Expo resolver ako postoji, 
  // inače prepuštamo Metro-u da odradi standardni posao
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  
  return context.resolveRequest(context, moduleName, platform);
};

// 5. TEK NA KRAJU omotamo sve sa withNativewind
// NativeWind će sada uzeti naš ispravljeni resolver i dodati svoju logiku povrh njega
module.exports = withNativewind(defaultConfig);
