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
} from 'react-native';
import { Image } from 'expo-image';
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
  const { user, updateProfile, logout, isLoading } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile({
        displayName,
        username,
        bio,
      });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      setDisplayName(user.displayName || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout }
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <UserIcon size={40} color={colors.textMuted} />
            </View>
          )}
          {isEditing && (
            <Pressable style={styles.cameraButton}>
              <Camera size={16} color="#fff" />
            </Pressable>
          )}
        </View>
        
        {!isEditing ? (
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{user?.displayName || 'User'}</Text>
            <Text style={styles.username}>@{user?.username || 'username'}</Text>
          </View>
        ) : (
          <Pressable onPress={handleCancel} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={displayName}
            onChangeText={setDisplayName}
            editable={isEditing}
            placeholder="Your name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={[styles.input, !isEditing && styles.inputDisabled]}
            value={username}
            onChangeText={setUsername}
            editable={isEditing}
            placeholder="username"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea, !isEditing && styles.inputDisabled]}
            value={bio}
            onChangeText={setBio}
            editable={isEditing}
            placeholder="Tell us about yourself"
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.infoRow}>
          <Globe size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>{user?.language || 'English'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Clock size={16} color={colors.textMuted} />
          <Text style={styles.infoText}>{user?.timezone || 'UTC'}</Text>
        </View>

        <View style={styles.actions}>
          {isEditing ? (
            <Pressable 
              style={[styles.button, styles.saveButton]} 
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
          ) : (
            <Pressable 
              style={[styles.button, styles.editButton]} 
              onPress={() => setIsEditing(true)}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>Edit Profile</Text>
            </Pressable>
          )}

          <Pressable style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
            <LogOut size={18} color={colors.error} />
            <Text style={[styles.buttonText, { color: colors.error }]}>Log Out</Text>
          </Pressable>
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
    marginBottom: 32,
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
  username: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  cancelButton: {
    marginTop: 10,
    padding: 8,
  },
  cancelButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
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
  logoutButton: {
    backgroundColor: '#fef2f2', // red-50
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
