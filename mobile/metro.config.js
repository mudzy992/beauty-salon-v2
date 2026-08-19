const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const projectRoot = __dirname;
const defaultConfig = getDefaultConfig(projectRoot);

// 1. ISKLJUČUJEMO CACHE I FORSIRAMO INLINE REQUIRES
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
  // A) AGRESIVNI FIKS ZA REANIMATED I WORKLETS PATH BUG (v5 bug)
  // Presreće bilo koju apsolutnu putanju (/tmp/...) koja pokušava učitati ove pakete
  if ((moduleName.includes('react-native-reanimated') || moduleName.includes('react-native-worklets')) && moduleName.length > 25) {
    try {
      // Dinamički pronalazimo pravi paket na trenutnoj mašini (u trenutnom /tmp/ build folderu)
      const targetPackage = moduleName.includes('reanimated') ? 'react-native-reanimated' : 'react-native-worklets';
      const resolvedMain = require.resolve(targetPackage, { paths: [projectRoot] });
      return { type: 'sourceFile', filePath: resolvedMain };
    } catch (e) {
      // Fallback ako require.resolve ne uspije
      const fallbackPath = moduleName.includes('reanimated') 
        ? 'node_modules/react-native-reanimated/src/index.ts'
        : 'node_modules/react-native-worklets/src/index.ts';
      return { type: 'sourceFile', filePath: path.join(projectRoot, fallbackPath) };
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
