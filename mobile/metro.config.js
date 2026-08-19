const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const defaultConfig = getDefaultConfig(__dirname);

// 1. Definiramo ključne putanje
const projectRoot = __dirname;
const reanimatedPkg = path.resolve(projectRoot, 'node_modules/react-native-reanimated');
const workletsPkg = path.resolve(projectRoot, 'node_modules/react-native-worklets');
const reanimatedShimFile = path.resolve(projectRoot, 'shims/react-native-reanimated.expo-go.js');
const workletsShimFile = path.resolve(projectRoot, 'shims/react-native-worklets.expo-go.js');

const isEasBuild = process.env.EAS_BUILD === 'true';
const isDevClient = process.argv.includes('--dev-client');
const useExpoGoShims = !isEasBuild && !isDevClient;

// 2. FIKS ZA SHA-1 GREŠKU: Dodajemo node_modules u watchFolders
// Ovo govori Metrou da smije čitati datoteke iz ovih foldera čak i kad ih resolver "preusmjeri"
defaultConfig.watchFolders = [
  projectRoot,
  reanimatedPkg,
  workletsPkg
];

const originalResolveRequest = defaultConfig.resolver.resolveRequest;

// 3. Resolver logika (identična kao prošli put, ali sigurnija)
defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  // Presretanje pokvarenih apsolutnih putanja iz react-native-css (v5 bug)
  if (moduleName.includes('eas-build-local-nodejs') && moduleName.includes('react-native-reanimated')) {
    return { type: 'sourceFile', filePath: reanimatedPkg };
  }

  // Logika za shims (Reanimated / Worklets)
  if (moduleName === 'react-native-reanimated' || moduleName.startsWith('react-native-reanimated/')) {
    const targetPath = useExpoGoShims ? reanimatedShimFile : reanimatedPkg;
    return { type: 'sourceFile', filePath: targetPath };
  }

  if (moduleName === 'react-native-worklets' || moduleName.startsWith('react-native-worklets/')) {
    const targetPath = useExpoGoShims ? workletsShimFile : workletsPkg;
    return { type: 'sourceFile', filePath: targetPath };
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// 4. Osiguravamo da resolver vidi node_modules mape
defaultConfig.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

module.exports = withNativewind(defaultConfig);
