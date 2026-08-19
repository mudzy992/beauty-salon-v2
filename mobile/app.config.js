/**
 * Expo config. projectId za push notifikacije: EXPO_PUBLIC_EAS_PROJECT_ID u .env
 * ili postavi extra.eas.projectId ispod.
 */
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || 'a697c506-8426-4064-99d8-780f9fc70700';

module.exports = {
  expo: {
    name: 'Beauty Salon Nejra',
    slug: 'beauty-salon-nejra',
    scheme: 'beauty-salon-nejra',
    version: '1.0.7',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    owner: 'mudzahud',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#E8A027',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.beautysalon.nejra',
      icon: './assets/icon.png',
    },
    android: {
      icon: './assets/icon.png',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon/foreground.png',
        backgroundImage: './assets/adaptive-icon/background.png',
        monochromeImage: './assets/monochrome-v3.png',
        backgroundColor: '#E8A027',
      },
      package: 'com.beautysalon.nejra',
      versionCode: 8,
      googleServicesFile: './google-services.json',
      softwareKeyboardLayoutMode: 'pan',
      permissions: ['REQUEST_INSTALL_PACKAGES'],
    },
    /** `androidNavigationBar` uklonjen — zastarjelo (Android 15 edge-to-edge / Expo SDK); koristi `expo-navigation-bar` + `react-native-edge-to-edge` + App `SystemBars`. */
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/splash.png',
          backgroundColor: '#E8A027',
          resizeMode: 'contain',
          imageWidth: 200,
        },
      ],
      'react-native-edge-to-edge',
      'expo-router',
      '@react-native-community/datetimepicker',
      [
        "expo-build-properties",
        {
            "android": {
                "compileSdkVersion": 36,
                "targetSdkVersion": 36,
                "buildToolsVersion": "36.0.0",
                "enableMinifyInReleaseBuilds": true,
                "enableShrinkResourcesInReleaseBuilds": true,
                "buildArchs": ["arm64-v8a"]
            }
        }
      ],
      [
        'expo-navigation-bar',
        {
          enforceContrast: false,
          // `style` is button foreground: `light` | `dark` (not `*-content`).
          style: 'light',
          /* Ne koristiti `backgroundColor` ovdje — Expo SDK prijavljuje deprecation (isti kao androidNavigationBar). Transparentan nav bar i dalje dolazi iz plugin stilova (`navigationBarColor` = transparent) + edge-to-edge. */
          hidden: false,
        },
      ],
      'expo-secure-store',
      'expo-localization',
      [
        'expo-notifications',
        {
          icon: './assets/monochrome-v3.png',
          color: '#fff8f0',
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
