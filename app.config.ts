import { ExpoConfig, ConfigContext } from 'expo/config';

const APP_DISPLAY_NAME =
  process.env.EXPO_PUBLIC_APP_DISPLAY_NAME ?? process.env.APP_DISPLAY_NAME ?? 'AuraLens';
const APP_SLUG = process.env.APP_SLUG ?? 'auralens';
const IOS_BUNDLE_ID = process.env.IOS_BUNDLE_ID ?? 'com.vybstak.auralens';
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE ?? 'com.vybstak.auralens';
const APP_VERSION = process.env.APP_VERSION ?? '0.1.0';
const IOS_BUILD_NUMBER = process.env.IOS_BUILD_NUMBER ?? '1';
const ANDROID_VERSION_CODE = Number(process.env.ANDROID_VERSION_CODE ?? '1');

const CAMERA_COPY = `${APP_DISPLAY_NAME} uses your camera only when you choose to create a symbolic aura reading.`;
const PHOTO_COPY = `${APP_DISPLAY_NAME} lets you select photos only when you choose to create or compare aura readings.`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: APP_DISPLAY_NAME,
  slug: APP_SLUG,
  scheme: APP_SLUG,
  version: APP_VERSION,
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'cover',
    backgroundColor: '#050507',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    bundleIdentifier: IOS_BUNDLE_ID,
    buildNumber: IOS_BUILD_NUMBER,
    supportsTablet: false,
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
    permissions: ['CAMERA', 'READ_MEDIA_IMAGES'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-camera',
      { cameraPermission: CAMERA_COPY },
    ],
    [
      'expo-image-picker',
      { photosPermission: PHOTO_COPY },
    ],
  ],
  extra: {
    appDisplayName: APP_DISPLAY_NAME,
    revenueCatIosKey: process.env.REVENUECAT_IOS_KEY ?? '',
    revenueCatAndroidKey: process.env.REVENUECAT_ANDROID_KEY ?? '',
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    eas: { projectId: process.env.EAS_PROJECT_ID ?? '' },
  },
  experiments: { typedRoutes: true },
});
