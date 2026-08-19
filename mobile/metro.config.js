const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const projectRoot = __dirname;
const defaultConfig = getDefaultConfig(projectRoot);

// Spremamo originalni resolver
const originalResolveRequest = defaultConfig.resolver.resolveRequest;

// Putanje do paketa na trenutnoj mašini (dinamički)
const reanimatedPkg = path.resolve(projectRoot, 'node_modules/react-native-reanimated');
const workletsPkg = path.resolve(projectRoot, 'node_modules/react-native-worklets');
const reanimatedShimFile = path.resolve(projectRoot, 'shims/react-native-reanimated.expo-go.js');
const workletsShimFile = path.resolve(projectRoot, 'shims/react-native-worklets.expo-go.js');

const isEasBuild = process.env.EAS_BUILD === 'true';
const isDevClient = process.argv.includes('--dev-client');
const useExpoGoShims = !isEasBuild && !isDevClient;

// Dodajemo u watchFolders da izbjegnemo SHA-1 grešku na bilo kojem OS-u
defaultConfig.watchFolders = [projectRoot];

defaultConfig.resolver.resolveRequest = (context, moduleName, platform) => {
  // 1. Uhvati bilo koji pokvareni import koji sadrži "react-native-reanimated" 
  // i ima neku čudnu putanju (kao onaj /tmp/ bug iz react-native-css)
  if (moduleName.includes('react-native-reanimated') && (moduleName.includes('/') || moduleName.includes('\\'))) {
    // Ako modul NIJE obični 'react-native-reanimated', nego neka duga putanja, 
    // prisilno ga vrati na pravi paket u node_modules
    if (!moduleName.startsWith('react-native-reanimated')) {
       return { type: 'sourceFile', filePath: reanimatedPkg };
    }
  }

  // 2. Standardna logika za shims
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

module.exports = withNativewind(defaultConfig);
