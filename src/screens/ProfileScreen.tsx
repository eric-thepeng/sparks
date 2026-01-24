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
  FlatList,
  RefreshControl,
  } from 'react-native';
  import { Image } from 'expo-image';
  // Use legacy import for getInfoAsync compatibility
  import * as FileSystem from 'expo-file-system/legacy';
  import * as ImageManipulator from 'expo-image-manipulator';
  import { useAuth } from '../context/AuthContext';
  import { 
    uploadImage, 
    getMyHistory, 
    getMyLikes, 
    unlikeItem, 
    clearHistory,
    ProfileItem,
    ApiPost 
  } from '../api';
  import { Camera, LogOut, Save, X, Globe, Clock, User as UserIcon, History as HistoryIcon, Heart, ChevronRight, Trash2, Sparkles } from 'lucide-react-native';
import { OnboardingScreen } from './OnboardingScreen';

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

export const ProfileScreen = ({ 
  onItemPress,
  onToggleLike,
  onHistoryPress,
  onLikesPress
}: { 
  onItemPress?: (id: string) => void;
  onToggleLike?: () => void;
  onHistoryPress?: () => void;
  onLikesPress?: () => void;
}) => {
  const { user, updateProfile, logout } = useAuth();
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);

  // Onboarding State (name selection)
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingName, setOnboardingName] = useState('');
  
  // Interests Onboarding Modal
  const [showInterestsModal, setShowInterestsModal] = useState(false);

  // Sync state with user data
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setAvatar(user.photoUrl || null);

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

      try {
        // Dynamic import to avoid crash if native module not available
        const ImagePicker = await import('expo-image-picker');
        
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true, // Allows user to crop ("chop")
          aspect: [1, 1],      // Force square aspect ratio
          quality: 1,          // Get full quality first, we compress later
        });
  
        if (!result.canceled && result.assets[0]) {
          // Resize and Compress ("Decrease Size")
          const manipResult = await ImageManipulator.manipulateAsync(
            result.assets[0].uri,
            [
              { resize: { width: 800 } } // Resize to 800px width (maintains aspect ratio)
            ],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG } // Compress to 70% quality
          );

          setAvatar(manipResult.uri);
        }
      } catch (error) {
      console.error('ImagePicker error:', error);
      Alert.alert(
        'Feature Unavailable',
        'Image picker is not available in this environment. Please use a development build.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSave = async () => {
    if (displayName.trim().length < 2) {
      Alert.alert('Validation Error', 'Display Name must be at least 2 characters.');
      return;
    }

    setLoading(true);
    try {
      let finalPhotoUrl = avatar;

      // Handle Image Upload if avatar is a local file
      if (avatar && (avatar.startsWith('file://') || avatar.startsWith('content://'))) {
         try {
           const fileInfo = await FileSystem.getInfoAsync(avatar);
           if (fileInfo.exists) {
             const MAX_SIZE = 5 * 1024 * 1024; // 5MB
             if (fileInfo.size > MAX_SIZE) {
               Alert.alert('File too large', 'Profile photo must be under 5MB.');
               setLoading(false);
               return;
             }
             
             // Upload
             console.log('Uploading image...');
             finalPhotoUrl = await uploadImage(avatar);
             console.log('Upload success, url:', finalPhotoUrl);
           }
         } catch (uploadError: any) {
           console.error('Upload failed:', uploadError);
           Alert.alert('Upload Failed', 'Could not upload profile photo. Please try again.');
           setLoading(false);
           return;
         }
      }

      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoUrl: finalPhotoUrl || undefined,
        // Include username to prevent backend reversion bug if it exists
        // username: user?.username 
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
      setAvatar(user.photoUrl || null);
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

  const renderProfileContent = () => (
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
          <>
            {/* Update Interests Button */}
            <Pressable 
              style={[styles.button, styles.interestsButton]} 
              onPress={() => setShowInterestsModal(true)}
            >
              <Sparkles size={18} color={colors.primary} />
              <Text style={[styles.buttonText, { color: colors.primary }]}>Update Interests</Text>
            </Pressable>

            <Pressable style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
              <LogOut size={18} color={colors.error} />
              <Text style={[styles.buttonText, { color: colors.error }]}>Log Out</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Interests Selection Modal */}
      <Modal
        visible={showInterestsModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowInterestsModal(false)}
      >
        <OnboardingScreen
          showCloseButton={true}
          onClose={() => setShowInterestsModal(false)}
          onComplete={() => {
            setShowInterestsModal(false);
            Alert.alert('Success', 'Your preferences have been updated');
          }}
        />
      </Modal>

      {/* Name Onboarding Modal */}
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

      {/* Header (Avatar & Name) - Always visible */}
      <View style={styles.header}>
        {/* Top Right Actions */}
        {!isEditing && (
          <View style={styles.headerRight}>
            <Pressable style={styles.headerActionButton} onPress={onHistoryPress}>
              <HistoryIcon size={24} color={colors.text} />
            </Pressable>
            <Pressable style={styles.headerActionButton} onPress={onLikesPress}>
              <Heart size={24} color={colors.text} />
            </Pressable>
          </View>
        )}

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
        
        {/* Basic Info */}
        {!isEditing && (
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{displayName || 'User'}</Text>
            {user?.userid && (
              <Text style={styles.idText}>ID: {user.userid}</Text>
            )}
          </View>
        )}
      </View>

      {/* Content Area */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {renderProfileContent()}
      </ScrollView>
    </View>
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
    paddingVertical: 24,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    position: 'relative',
  },
  headerRight: {
    position: 'absolute',
    top: 20,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.primary,
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
  interestsButton: {
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: colors.primary,
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
  // List Styles
  listContainer: {
    flex: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
    gap: 16,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    overflow: 'hidden',
  },
  itemCardMain: {
    flex: 1,
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    aspectRatio: 1, // Ensure it's always a square
  },
  itemImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.3 }], // Zoom in to remove any potential black bars/borders
  },
  itemPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemPlaceholderText: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textMuted,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  itemDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  likesToggleSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  likesToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  likesToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  likesToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  likesInsideContent: {
    paddingBottom: 20,
  },
  emptyLikesText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: 20,
  },
  loadMoreInline: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 8,
    marginTop: 8,
  },
  loadMoreInlineText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
});
