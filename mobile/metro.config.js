const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const config = withNativewind(getDefaultConfig(__dirname));

const isEasBuild = process.env.EAS_BUILD === 'true';
const isDevClient = process.argv.includes('--dev-client');
const useExpoGoShims = !isEasBuild && !isDevClient;

// Pravi paketi u tvojim node_modules
const reanimatedPkg = path.resolve(__dirname, 'node_modules/react-native-reanimated');
const workletsPkg = path.resolve(__dirname, 'node_modules/react-native-worklets');

// Shims za Expo Go
const reanimatedShimFile = path.resolve(__dirname, 'shims/react-native-reanimated.expo-go.js');
const workletsShimFile = path.resolve(__dirname, 'shims/react-native-worklets.expo-go.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // 1. PRESRETANJE: Bilo koja apsolutna putanja koja ide u /tmp/administrator/eas-build...
  // Ovo "ubija" bug iz react-native-css paketa
  if (moduleName.includes('eas-build-local-nodejs') && moduleName.includes('react-native-reanimated')) {
    return { type: 'sourceFile', filePath: reanimatedPkg };
  }

  // 2. LOGIKA ZA SHIM-ove (Expo Go vs Production Build)
  if (moduleName === 'react-native-reanimated' || moduleName.startsWith('react-native-reanimated/')) {
    const targetPath = useExpoGoShims ? reanimatedShimFile : reanimatedPkg;
    return { type: 'sourceFile', filePath: targetPath };
  }

  if (moduleName === 'react-native-worklets' || moduleName.startsWith('react-native-worklets/')) {
    const targetPath = useExpoGoShims ? workletsShimFile : workletsPkg;
    return { type: 'sourceFile', filePath: targetPath };
  }

  // Za sve ostalo koristi standardni resolver
  if (config.resolver.resolveRequest && config.resolver.resolveRequest !== context.resolveRequest) {
     return config.resolver.resolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
