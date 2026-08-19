const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const projectRoot = __dirname;
const defaultConfig = getDefaultConfig(projectRoot);

// 1. ISKLJUČUJEMO CACHE (Ovo je ključno za SHA-1 grešku na serveru)
defaultConfig.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true, // Pomaže kod performansi i resolve-a
  },
});

// 2. PRISILNO ČIŠĆENJE WATCH FOLDERA
defaultConfig.watchFolders = [projectRoot];

const originalResolveRequest = defaultConfig.resolver.resolveRequest;

defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  // A) Presretanje bilo kakvog uvoza koji sadrži "react-native-reanimated"
  // Ako vidimo putanju (slash), ili ako vidimo fiksni ID iz greške
  if (moduleName.includes('react-native-reanimated')) {
    // Ako uvoz nije čisti "react-native-reanimated", preusmjeri ga na lokalni paket
    if (moduleName !== 'react-native-reanimated') {
       return {
         type: 'sourceFile',
         filePath: path.resolve(projectRoot, 'node_modules/react-native-reanimated/lib/commonjs/index.js'),
       };
    }
  }

  // B) Standardna logika za shims (Expo Go podrška)
  const isEasBuild = process.env.EAS_BUILD === 'true';
  const isDevClient = process.argv.includes('--dev-client');
  const useExpoGoShims = !isEasBuild && !isDevClient;

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

module.exports = withNativewind(defaultConfig);
