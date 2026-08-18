const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const config = withNativewind(getDefaultConfig(__dirname));

const isEasBuild = process.env.EAS_BUILD === 'true';
const isDevClient = process.argv.includes('--dev-client');
const stubAndroidWorklets = !isEasBuild && !isDevClient;

if (stubAndroidWorklets) {
  const workletsShim = path.resolve(__dirname, 'shims/react-native-worklets.expo-go.js');
  const reanimatedShim = path.resolve(__dirname, 'shims/react-native-reanimated.expo-go.js');
  const previousResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (platform === 'android' && moduleName === 'react-native-worklets') {
      return { type: 'sourceFile', filePath: workletsShim };
    }
    if (platform === 'android' && moduleName === 'react-native-reanimated') {
      return { type: 'sourceFile', filePath: reanimatedShim };
    }
    if (previousResolveRequest) {
      return previousResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
