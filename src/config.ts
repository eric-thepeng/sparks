// Configuration module to handle environment variables

// Helper to safely access environment variables
const getEnv = (key: string, defaultValue: string = ''): string => {
  // Try import.meta.env (Vite)
  try {
    // @ts-ignore
    if (import.meta && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch (e) {
    // Ignore error
  }

  // Fallback to process.env (React Native / standard Node)
  try {
    // @ts-ignore
    if (process.env && process.env[key]) {
      // @ts-ignore
      return process.env[key];
    }
  } catch (e) {
    // Ignore error
  }

  return defaultValue;
};

export const config = {
  // Use EXPO_PUBLIC_ prefix for Expo to auto-load these variables
  // Static access is required for the compiler to correctly "bake" these into the native build
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://spark-api-346549054402.us-east1.run.app',
  apiPrefix: process.env.EXPO_PUBLIC_API_PREFIX || '',
  authStorageKey: process.env.EXPO_PUBLIC_AUTH_STORAGE_KEY || 'auth',
  googleClientId: process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID || '',
  iosGoogleClientId: process.env.EXPO_PUBLIC_IOS_OAUTH_CLIENT_ID || '',
};
