import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Algomart',
  slug: 'algomart',
  version: '1.0.0',
  orientation: 'portrait',
  scheme: 'algomart',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.algomart.app',
    infoPlist: {
      NSAppTransportSecurity: {
        NSAllowsLocalNetworking: true,
      },
    },
  },
  android: {
    package: 'com.algomart.app',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    serverHost: process.env.REACT_NATIVE_PACKAGER_HOSTNAME ?? null,
    apiToken: process.env.API_TOKEN ?? null,
  },
});
