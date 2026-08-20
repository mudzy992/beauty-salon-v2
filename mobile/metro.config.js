const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

// 1. Dohvaćanje osnovne konfiguracije za projekt
const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const isDevClient = process.argv.includes('--dev-client');
// Šimove koristimo ISKLJUČIVO za `expo start` u Expo Go (ne za EAS/Gradle/release bundle)
const useExpoGoShims =
  process.argv.includes('start') && !isDevClient && process.env.EAS_BUILD !== 'true';

// 2. Definiranje putanja do paketa
const reanimatedPkg = path.resolve(projectRoot, 'node_modules/react-native-reanimated');
const workletsPkg = path.resolve(projectRoot, 'node_modules/react-native-worklets');

// Spremanje originalnog resolvera za lančano pozivanje
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // A) FIKS ZA KRIVE PUTANJE (Bug iz react-native-css/reanimated)
  // Ako import sadrži apsolutnu putanju (/tmp/...) ili krive shims putanje, vraćamo na pravi node_modules
  if (moduleName.includes('react-native-reanimated') && moduleName.length > 30) {
    return {
      type: 'sourceFile',
      filePath: require.resolve('react-native-reanimated', { paths: [projectRoot] }),
    };
  }
  if (moduleName.includes('react-native-worklets') && moduleName.length > 30) {
    return {
      type: 'sourceFile',
      filePath: require.resolve('react-native-worklets', { paths: [projectRoot] }),
    };
  }

  // B) LOGIKA ZA EXPO GO ŠIMOVE
  if (useExpoGoShims) {
    if (moduleName === 'react-native-reanimated' || moduleName.startsWith('react-native-reanimated/')) {
      return { 
        type: 'sourceFile', 
        filePath: path.resolve(projectRoot, 'shims/react-native-reanimated.expo-go.js') 
      };
    }
    if (moduleName === 'react-native-worklets' || moduleName.startsWith('react-native-worklets/')) {
      return { 
        type: 'sourceFile', 
        filePath: path.resolve(projectRoot, 'shims/react-native-worklets.expo-go.js') 
      };
    }
  }

  // C) POZIVANJE DEFAULTNOG ILI PRETHODNOG RESOLVERA
  // Ispravan način pozivanja lanca resolvera u Expo CLI okruženju
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// 3. Konfiguracija za izbjegavanje SHA-1 greške (dodavanje u watchFolders)
config.watchFolders = [projectRoot, reanimatedPkg, workletsPkg];

// 4. Integracija s NativeWind (v5)
module.exports = withNativewind(config);
