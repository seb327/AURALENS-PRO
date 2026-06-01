// AuraLens public Expo config.
//
// SECURITY: only EXPO_PUBLIC_* (and identity vars like APP_DISPLAY_NAME) are
// safe to expose in `extra`. Never read a service_role JWT or a server-only
// LLM key here — `scripts/verify-integrations.js` will fail loudly if you do.

const APP_DISPLAY_NAME =
  process.env.EXPO_PUBLIC_APP_DISPLAY_NAME ||
  process.env.APP_DISPLAY_NAME ||
  'AuraLens';
const APP_SLUG = process.env.APP_SLUG || 'auralens';
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID || 'com.vybstak.auralens';
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE || 'com.vybstak.auralens';
const APP_VERSION = process.env.APP_VERSION || '0.1.0';
const IOS_BUILD_NUMBER = process.env.IOS_BUILD_NUMBER || '1';
const ANDROID_VERSION_CODE = Number(process.env.ANDROID_VERSION_CODE || 1);

const CAMERA_COPY = `${APP_DISPLAY_NAME} uses your camera only when you choose to create a symbolic aura reading.`;
const PHOTO_COPY = `${APP_DISPLAY_NAME} lets you select photos only when you choose to create or compare aura readings.`;

// Accept either the unprefixed or EXPO_PUBLIC_-prefixed env var name for the
// RevenueCat keys — both are public SDK keys, safe to bundle.
const RC_IOS = process.env.REVENUECAT_IOS_KEY || process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';
const RC_ANDROID = process.env.REVENUECAT_ANDROID_KEY || process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || '';

module.exports = ({ config }) => ({
  ...config,
  name: APP_DISPLAY_NAME,
  slug: APP_SLUG,
  scheme: APP_SLUG,
  version: APP_VERSION,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'cover',
    backgroundColor: '#050507',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: IOS_BUNDLE_ID,
    buildNumber: IOS_BUILD_NUMBER,
    icon: './assets/icon.png',
    infoPlist: {
      NSCameraUsageDescription: CAMERA_COPY,
      NSPhotoLibraryUsageDescription: PHOTO_COPY,
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: ANDROID_PACKAGE,
    versionCode: ANDROID_VERSION_CODE,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#050507',
    },
    permissions: ['CAMERA', 'READ_MEDIA_IMAGES', 'READ_EXTERNAL_STORAGE'],
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-camera',
    'expo-image-picker',
    'expo-secure-store',
  ],
  extra: {
    appDisplayName: APP_DISPLAY_NAME,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
    aiBuddyUrl: process.env.EXPO_PUBLIC_AI_BUDDY_URL || '',
    revenueCatIosKey: RC_IOS,
    revenueCatAndroidKey: RC_ANDROID,
    eas: {
      projectId:
        process.env.EAS_PROJECT_ID || '26bae954-7ac6-4dc3-8735-c21e00d38c6e',
    },
  },
});
