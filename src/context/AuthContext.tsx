import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { User, LoginRequest, SignupRequest, GoogleLoginRequest } from '../api/types';
import { 
  login as apiLogin, 
  signup as apiSignup, 
  getMe as apiGetMe, 
  updateMe as apiUpdateMe,
  loginWithGoogle as apiLoginWithGoogle
} from '../api';
import { config } from '../config';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  loginGoogle: (data: GoogleLoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  setError: (message: string) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to detect and update missing metadata
  const checkAndFillMetadata = async (currentUser: User) => {
    if (!currentUser) return;
    
    const needsUpdate: Partial<User> = {};
    
    if (!currentUser.timezone) {
      let timeZone = 'UTC';
      try {
        // @ts-ignore
        if (Localization.getCalendars) {
           timeZone = Localization.getCalendars()[0]?.timeZone || 'UTC';
        } else {
           // Fallback for when native module is missing
           timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        }
      } catch (e) {
        console.warn('Timezone detection failed, using UTC');
      }
      needsUpdate.timezone = timeZone;
    }

    if (!currentUser.language) {
      let locale = 'en-US';
      try {
        // @ts-ignore
        if (Localization.getLocales) {
           locale = Localization.getLocales()[0]?.languageTag || 'en-US';
        } else {
           // Fallback
           // @ts-ignore
           locale = (typeof navigator !== 'undefined' && navigator.language) || 'en-US';
        }
      } catch (e) {
        console.warn('Language detection failed, using en-US');
      }
      needsUpdate.language = locale;
    }

    if (Object.keys(needsUpdate).length > 0) {
      try {
        console.log('[Auth] Updating missing metadata:', needsUpdate);
        await apiUpdateMe(needsUpdate);
        
        // Fetch fresh user again to sync state
        const freshUserResponse = await apiGetMe();
        // @ts-ignore
        const freshUser = freshUserResponse.user || (freshUserResponse.id ? freshUserResponse : null);
        
        if (freshUser) {
           setUser(freshUser);
           // Also update storage
           const storedAuth = await AsyncStorage.getItem(config.authStorageKey);
           if (storedAuth) {
             const { token } = JSON.parse(storedAuth);
             await AsyncStorage.setItem(config.authStorageKey, JSON.stringify({ token, user: freshUser }));
           }
        }
      } catch (err) {
        console.error('[Auth] Failed to auto-update metadata:', err);
      }
    }
  };

  // Load auth state from storage on boot
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const storedAuth = await AsyncStorage.getItem(config.authStorageKey);
        if (storedAuth) {
          const { token: storedToken, user: storedUser } = JSON.parse(storedAuth);
          if (storedToken) {
            setToken(storedToken);
              // Verify token and refresh user data
            try {
              // We need to set the token in a way API client can use it, 
              // but API client reads from AsyncStorage directly in this implementation.
              // Just to be safe, we rely on the stored value.
              const response = await apiGetMe();
              let freshUser = response.user || (response.id ? response : null);
              
              // Check metadata
              // @ts-ignore
              freshUser = await checkAndFillMetadata(freshUser);

              setUser(freshUser);
              // Update storage with fresh user
              // @ts-ignore
              await AsyncStorage.setItem(config.authStorageKey, JSON.stringify({ token: storedToken, user: freshUser }));
            } catch (err) {
              // Token invalid or expired
              await logout();
            }
          }
        }
      } catch (e) {
        console.error('Failed to load auth state', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuth();
  }, []);

  const saveAuth = async (newToken: string, newUser: User) => {
    try {
      await AsyncStorage.setItem(config.authStorageKey, JSON.stringify({ token: newToken, user: newUser }));
      setToken(newToken);
      setUser(newUser);
    } catch (e) {
      console.error('Failed to save auth state', e);
    }
  };

  const login = async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiLogin(data);
      // Save auth FIRST so token is available for API calls
      await saveAuth(response.token, response.user);
      
      // Then check metadata in background
      checkAndFillMetadata(response.user);
      
      // Update SavedContext if needed, though SavedContext should listen to storage/state
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiSignup(data);
      // Save auth FIRST
      await saveAuth(response.token, response.user);
      
      // Then check metadata
      checkAndFillMetadata(response.user);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const loginGoogle = async (data: GoogleLoginRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiLoginWithGoogle(data);
      // Save auth FIRST
      await saveAuth(response.token, response.user);
      
      // Then check metadata
      checkAndFillMetadata(response.user);
    } catch (err: any) {
      setError(err.message || 'Google login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(config.authStorageKey);
      setToken(null);
      setUser(null);
    } catch (e) {
      console.error('Failed to logout', e);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[Auth] Updating profile:', data);
      // 1. Call update
      await apiUpdateMe(data);
      
      // 2. Fetch fresh user to ensure we have the DB state
      const freshUserResponse = await apiGetMe();
      // Handle unwrapped response (backend might return user directly)
      // @ts-ignore - Check if response is the user object itself
      const freshUser = freshUserResponse.user || (freshUserResponse.id ? freshUserResponse : null);
      
      console.log('[Auth] Fresh user:', freshUser);

      if (token && freshUser) {
        await saveAuth(token, freshUser);
      }
    } catch (err: any) {
      console.error('[Auth] Update failed:', err);
      setError(err.message || 'Update profile failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isLoading, 
      error, 
      login, 
      signup, 
      loginGoogle,
      logout, 
      updateProfile,
      setError,
      clearError 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
