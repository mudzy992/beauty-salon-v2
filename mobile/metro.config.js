const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const isEasBuild = process.env.EAS_BUILD === 'true';
const isDevClient = process.argv.includes('--dev-client');
// Šimove koristimo ISKLJUČIVO ako nije EAS build i nije Dev Client (dakle samo obični Expo Go)
const useExpoGoShims = !isEasBuild && !isDevClient;

// Pravi paketi (ono što npm ls vidi)
const reanimatedPkg = path.resolve(projectRoot, 'node_modules/react-native-reanimated');
const workletsPkg = path.resolve(projectRoot, 'node_modules/react-native-worklets');

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // 1. FIKS ZA KRIVE PUTANJE (Bug iz react-native-css/reanimated)
  // Ako import sadrži apsolutnu putanju /tmp/... ili shims/packages, vrati ga na pravi node_modules
  if (moduleName.includes('react-native-reanimated') && moduleName.length > 30) {
    return { type: 'sourceFile', filePath: path.resolve(reanimatedPkg, 'lib/commonjs/index.js') };
  }
  if (moduleName.includes('react-native-worklets') && moduleName.length > 30) {
    return { type: 'sourceFile', filePath: path.resolve(workletsPkg, 'lib/commonjs/index.js') };
  }

  // 2. LOGIKA ZA EXPO GO ŠIMOVE
  if (useExpoGoShims) {
    if (moduleName === 'react-native-reanimated' || moduleName.startsWith('react-native-reanimated/')) {
      return { type: 'sourceFile', filePath: path.resolve(projectRoot, 'shims/react-native-reanimated.expo-go.js') };
    }
    if (moduleName === 'react-native-worklets' || moduleName.startsWith('react-native-worklets/')) {
      return { type: 'sourceFile', filePath: path.resolve(projectRoot, 'shims/react-native-worklets.expo-go.js') };
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Obavezno dodajemo watchFolders da izbjegnemo SHA-1 grešku
config.watchFolders = [projectRoot, reanimatedPkg, workletsPkg];

module.exports = withNativewind(config);
