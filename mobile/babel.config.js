const path = require('path');

module.exports = function (api) {
  api.cache(true);
  const isEasBuild = process.env.EAS_BUILD === 'true';
  const isDevClient = process.argv.includes('--dev-client');
  const useNativeReanimated = isEasBuild || isDevClient;

  const alias = {
    '@': './src',
  };

  if (!useNativeReanimated) {
    alias['react-native-reanimated'] = path.resolve(
      __dirname,
      'shims/packages/react-native-reanimated',
    );
    alias['react-native-worklets'] = path.resolve(__dirname, 'shims/packages/react-native-worklets');
  }

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias,
        },
      ],
      ...(useNativeReanimated ? ['react-native-reanimated/plugin'] : []),
    ],
  };
};
