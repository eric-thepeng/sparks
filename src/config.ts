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
  apiBaseUrl: getEnv('VITE_API_BASE_URL', 'https://spark-api-nvy6vvhfoa-ue.a.run.app'),
  apiPrefix: getEnv('VITE_API_PREFIX', ''),
  authStorageKey: getEnv('VITE_AUTH_STORAGE_KEY', 'auth'),
  googleClientId: getEnv('VITE_GOOGLE_OAUTH_CLIENT_ID'),
  appleClientId: getEnv('VITE_APPLE_OAUTH_CLIENT_ID'),
};
