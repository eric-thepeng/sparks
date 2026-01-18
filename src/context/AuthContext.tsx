import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
              setUser(response.user);
              // Update storage with fresh user
              await AsyncStorage.setItem(config.authStorageKey, JSON.stringify({ token: storedToken, user: response.user }));
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
      await saveAuth(response.token, response.user);
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
      await saveAuth(response.token, response.user);
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
      await saveAuth(response.token, response.user);
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
      const response = await apiUpdateMe(data);
      // Keep token, update user
      if (token) {
        await saveAuth(token, response.user);
      }
    } catch (err: any) {
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
