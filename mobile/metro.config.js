const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const projectRoot = __dirname;
const defaultConfig = getDefaultConfig(projectRoot);

// 1. ISKLJUČUJEMO CACHE I FORSIRAMO INLINE REQUIRES
// Ovo sprječava SHA-1 mismatch jer Metro ne analizira statički cijelo stablo unaprijed
defaultConfig.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

// 2. WATCH FOLDERS I PROJECT ROOT
defaultConfig.watchFolders = [projectRoot];
defaultConfig.projectRoot = projectRoot;

const originalResolveRequest = defaultConfig.resolver.resolveRequest;

defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  // A) AGRESIVNI FIKS ZA REANIMATED PATH BUG (react-native-css)
  // Ako moduleName sadrži "react-native-reanimated" i NIJE obični import (ima putanju u sebi)
  if (moduleName.includes('react-native-reanimated') && moduleName.length > 25) {
    try {
      // Dinamički pronalazimo pravi ulazni file za Reanimated na trenutnoj mašini
      const reanimatedMain = require.resolve('react-native-reanimated', { paths: [projectRoot] });
      return { type: 'sourceFile', filePath: reanimatedMain };
    } catch (e) {
      // Fallback ako require.resolve ne uspije
      return { type: 'sourceFile', filePath: path.join(projectRoot, 'node_modules/react-native-reanimated/src/index.ts') };
    }
  }

  // B) LOGIKA ZA SHIMS (Expo Go podrška)
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

  // C) PROSLJEĐIVANJE NA ORIGINALNI RESOLVER
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativewind(defaultConfig);
