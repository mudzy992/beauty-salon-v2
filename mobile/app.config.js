/**
 * Expo config. projectId za push notifikacije: EXPO_PUBLIC_EAS_PROJECT_ID u .env
 * ili postavi extra.eas.projectId ispod.
 */
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || 'a697c506-8426-4064-99d8-780f9fc70700';

module.exports = {
  expo: {
    name: 'Beauty Salon Nejra',
    slug: 'beauty-salon-nejra',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    owner: 'mudzahud',
    splash: {
      image: './assets/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#1A1A1A',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.beautysalon.nejra',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#1A1A1A',
      },
      package: 'com.beautysalon.nejra',
      googleServicesFile: './google-services.json',
    },
    web: {
      favicon: './assets/icon.png',
    },
    plugins: [
      'react-native-edge-to-edge',
      'expo-secure-store',
      'expo-localization',
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#D4A843',
        },
      ],
      'expo-font',
      'expo-image',
      [
        'expo-image-picker',
        {
          photosPermission:
            'Aplikaciji je potreban pristup galeriji za dodavanje before/after slika u dnevnu knjigu.',
        },
      ],
    ],
    extra: {
      eas: {
        projectId,
      },
    },
  },
};
