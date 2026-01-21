import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Check, AlertCircle } from 'lucide-react-native';
import { config } from '../config';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

// Reusing colors from App.tsx design system
const colors = {
  primary: '#4f46e5',
  primaryBg: '#eef2ff',
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  error: '#ef4444',
};

export const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const { login, signup, loginGoogle, isLoading, error, setError, clearError } = useAuth();
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const [username, setUsername] = useState(''); // Removed
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Google Auth Request
  const [request, response, promptAsync] = Google.useAuthRequest({
    // Only pass iosClientId on iOS to prevent Web ID usage
    iosClientId: '346549054402-ht0fov6e0c1amn2ec1v6o5sd0i8vmjrj.apps.googleusercontent.com',
    androidClientId: config.googleClientId,
    // Use scheme for native development builds
    redirectUri: makeRedirectUri({
      scheme: 'com.googleusercontent.apps.346549054402-ht0fov6e0c1amn2ec1v6o5sd0i8vmjrj'
    })
  });

  useEffect(() => {
    if (request) {
      console.log('Generated Redirect URI:', request.redirectUri);
    }
  }, [request]);

  // Handle Proxy Redirect URI manually if needed, usually promptAsync handles it for Expo Go.
  // But verifying useProxy is true by default.

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        // Backend now handles ID generation, no username needed
        loginGoogle({ idToken: id_token });
      }
    }
  }, [response]);

  const handleSubmit = async () => {
    if (isLoading) return;
    clearError();

    // Password Validation
    // Simple length check only, let backend handle complexity
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    try {
      if (isLogin) {
        if (!email || !password) {
          setError('Please fill in all fields');
          return;
        }
        await login({ email, password });
      } else {
        // Signup
        if (!email || !password || !confirmPassword) {
          setError('Please fill in all fields');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }
        // Removed complex regex check
        
        if (!agreeTerms) {
          setError('Please agree to the terms');
          return;
        }

        
        await signup({ email, password, confirmPassword });
      }
    } catch (e) {
      // Error is handled in context and displayed via `error` prop
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    clearError();
    setEmail('');
    setPassword('');
    // setUsername(''); // Username state is no longer used
    setConfirmPassword('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
          <Text style={styles.subtitle}>
            {isLogin ? 'Sign in to continue' : 'Join our community today'}
          </Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <AlertCircle size={20} color={colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          {/* Username field removed for Signup as it is auto-generated */}
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="hello@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          {!isLogin && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color={colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <Pressable 
                style={styles.checkboxContainer} 
                onPress={() => setAgreeTerms(!agreeTerms)}
              >
                <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]}>
                  {agreeTerms && <Check size={14} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>I agree to the Terms & Conditions</Text>
              </Pressable>
            </>
          )}

          <Pressable 
            style={[styles.button, isLoading && styles.buttonDisabled]} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{isLogin ? 'Sign In' : 'Sign Up'}</Text>
            )}
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialButtons}>
            <Pressable 
              style={[styles.socialButton, styles.googleButton]}
              onPress={() => {
                if (!config.googleClientId) {
                  Alert.alert("Configuration Error", "Google Client ID is missing.");
                  return;
                }
                if (!request) {
                   Alert.alert("Error", "Auth request not ready.");
                   return;
                }
                promptAsync();
              }}
              // disabled={!request} // Don't disable visibly, let user click and see error if needed
            >
              {/* Use a simple G icon if possible, or just text */}
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </Pressable>
            
            {/* Show error text if configured wrong but still allow button to be there */}
            {!config.googleClientId && (
               <Text style={[styles.textSecondary, {textAlign: 'center', fontSize: 12, marginTop: 4}]}>
                 (Setup VITE_GOOGLE_OAUTH_CLIENT_ID to enable)
               </Text>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
            </Text>
            <Pressable onPress={toggleMode}>
              <Text style={styles.footerLink}>
                {isLogin ? 'Sign Up' : 'Log In'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: colors.text,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.primary,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    color: colors.textMuted,
  },
  socialButtons: {
    flexDirection: 'column',
    gap: 16,
    // justifyContent: 'center', // No longer needed for single column
  },
  socialButton: {
    width: '100%', // Full width
    height: 50,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButton: {
    // specific styles if needed
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    flex: 1,
  },
  textSecondary: {
    color: colors.textSecondary,
  }
});
