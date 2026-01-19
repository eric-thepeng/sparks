import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { Camera, LogOut, Save, X, Globe, Clock, User as UserIcon } from 'lucide-react-native';

// Reusing colors
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
  success: '#22c55e',
};

export const ProfileScreen = () => {
  const { user, updateProfile, logout } = useAuth();
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');

  // Sync state with user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || null);

      // Trigger onboarding if no display name is set (fresh signup)
      // Check if displayName is empty/null or matches the 8-digit ID exactly
      if (!user.displayName || (user.userid && user.displayName === user.userid)) {
         // Also check if userid looks like generated ID to be sure
         if (/^\d{8}$/.test(user.userid || '')) {
            setShowOnboarding(true);
            setOnboardingName('');
         }
      }
    }
  }, [user]);

  const pickImage = async () => {
    if (!isEditing) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true, // Optional: get base64 if backend needs it
    });

    if (!result.canceled && result.assets[0]) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (displayName.trim().length < 2) {
      Alert.alert('Validation Error', 'Display Name must be at least 2 characters.');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar: avatar || undefined,
        // Include username to prevent backend reversion bug if it exists
        username: user?.username 
      });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Revert to original user data
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || null);
    }
    setIsEditing(false);
  };

  const handleOnboardingSubmit = async () => {
    if (onboardingName.trim().length < 2) {
      Alert.alert('Invalid Name', 'Name must be at least 2 characters.');
      return;
    }
    
    setLoading(true);
    try {
      await updateProfile({ displayName: onboardingName.trim() });
      setShowOnboarding(false);
      Alert.alert('Welcome!', `Hello, ${onboardingName}`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Onboarding Modal */}
      <Modal
        visible={showOnboarding}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {}} // Prevent closing
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose a Display Name</Text>
            <Text style={styles.modalSubtitle}>How should we call you?</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Alex"
              value={onboardingName}
              onChangeText={setOnboardingName}
              autoCapitalize="words"
            />
            
            <Pressable 
              style={[styles.button, styles.saveButton, { width: '100%', marginTop: 16 }]} 
              onPress={handleOnboardingSubmit}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.buttonText}>Get Started</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Main Profile UI */}
      <View style={styles.header}>
        <Pressable onPress={pickImage} disabled={!isEditing} style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <UserIcon size={40} color={colors.textMuted} />
            </View>
          )}
          
          {isEditing && (
            <View style={styles.cameraButton}>
              <Camera size={16} color="#fff" />
            </View>
          )}
        </Pressable>
        
        {/* View Mode: Name & ID */}
        {!isEditing && (
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{displayName || 'User'}</Text>
            {user?.userid && (
              <Text style={styles.idText}>ID: {user.userid}</Text>
            )}
          </View>
        )}
      </View>

      <View style={styles.form}>
        {/* Edit Mode: Display Name Input */}
        {isEditing && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your Name"
            />
          </View>
        )}

        {/* Bio Field (View/Edit) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea, !isEditing && styles.inputDisabled]}
            value={bio}
            onChangeText={setBio}
            editable={isEditing}
            placeholder={isEditing ? "Write something about yourself..." : "No bio yet."}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Info Rows (ReadOnly) */}
        <View style={styles.infoRow}>
          <Globe size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>{user?.language || 'English'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Clock size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>{user?.timezone || 'UTC'}</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isEditing ? (
            <View style={styles.editActions}>
              <Pressable 
                style={[styles.button, styles.cancelButton]} 
                onPress={handleCancel}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.button, styles.saveButton, { flex: 1 }]} 
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Save size={18} color="#fff" />
                    <Text style={styles.buttonText}>Save Changes</Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable 
              style={[styles.button, styles.editButton]} 
              onPress={() => setIsEditing(true)}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Edit Profile</Text>
            </Pressable>
          )}

          {!isEditing && (
            <Pressable style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
              <LogOut size={18} color={colors.error} />
              <Text style={[styles.buttonText, { color: colors.error }]}>Log Out</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.card,
    borderWidth: 4,
    borderColor: colors.card,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: colors.card,
  },
  headerInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  idText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputDisabled: {
    backgroundColor: colors.bg,
    borderColor: 'transparent',
    color: colors.textSecondary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  actions: {
    marginTop: 32,
    gap: 12,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 12,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  editButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButton: {
    backgroundColor: colors.bg,
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    width: '100%',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
});
