const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const config = withNativewind(getDefaultConfig(__dirname));

const isEasBuild = process.env.EAS_BUILD === 'true';
const isDevClient = process.argv.includes('--dev-client');
const useExpoGoShims = !isEasBuild && !isDevClient;

const reanimatedShimPkg = path.resolve(__dirname, 'shims/packages/react-native-reanimated');
const workletsShimPkg = path.resolve(__dirname, 'shims/packages/react-native-worklets');
const reanimatedShimFile = path.resolve(__dirname, 'shims/react-native-reanimated.expo-go.js');
const workletsShimFile = path.resolve(__dirname, 'shims/react-native-worklets.expo-go.js');

function isShimTarget(moduleName) {
  return (
    moduleName === 'react-native-reanimated' ||
    moduleName.startsWith('react-native-reanimated/') ||
    moduleName === 'react-native-worklets' ||
    moduleName.startsWith('react-native-worklets/')
  );
}

function resolveShim(moduleName) {
  if (moduleName === 'react-native-reanimated' || moduleName.startsWith('react-native-reanimated/')) {
    return reanimatedShimFile;
  }
  if (moduleName === 'react-native-worklets' || moduleName.startsWith('react-native-worklets/')) {
    return workletsShimFile;
  }
  return null;
}

if (useExpoGoShims) {
  config.resolver.extraNodeModules = {
    ...(config.resolver.extraNodeModules ?? {}),
    'react-native-reanimated': reanimatedShimPkg,
    'react-native-worklets': workletsShimPkg,
  };

  const previousResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (isShimTarget(moduleName)) {
      const shimPath = resolveShim(moduleName);
      if (shimPath) {
        return { type: 'sourceFile', filePath: shimPath };
      }
    }
    if (previousResolveRequest) {
      return previousResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
