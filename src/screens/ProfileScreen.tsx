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
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import {
  uploadImage,
  getMyHistory,
  getMyLikes,
  unlikeItem,
  clearHistory,
  ProfileItem,
  ApiPost
} from '../api';
import { 
  Camera, 
  LogOut, 
  Save, 
  X, 
  Globe, 
  Clock, 
  User as UserIcon, 
  History as HistoryIcon, 
  Heart, 
  ChevronRight, 
  Trash2, 
  Sparkles,
  Pencil,
  Check
} from 'lucide-react-native';
import { TAGS, InterestLevel } from '../data/buckets';
import { OnboardingScreen } from './OnboardingScreen';
import { FeedItem } from '../data';

// Yellow (Sunglow) 色彩系统 - Warm Stone/Grey Contrast
const colors = {
  primary: '#FFD166',      // Sunglow
  primaryLight: '#FFE5A0', // Pale Sunglow
  primaryDark: '#F4B350',  // Deep Sunglow
  primaryBg: '#FFF0C2',    // Light Amber/Cream
  accent: '#f43f5e',       // rose-500
  bg: '#F4F1E6',           // Distinct Sand background
  card: '#FFFEF9',         // Lighter Creamy White
  text: '#451a03',         // Amber 950
  textSecondary: '#78350f',// Amber 900
  textMuted: '#92400e',    // Amber 800
  border: '#E8E4D6',       // Sand Border
  error: '#ef4444',
  success: '#22c55e',
  selectedBorder: '#B45309', // Deep Amber for selected
};

// Formatting Helpers
const formatLanguage = (langCode: string | null) => {
  if (!langCode) return 'English';

  try {
    // @ts-ignore
    if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
      // @ts-ignore
      const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
      // zh-Hans-US -> zh-Hans
      const parts = langCode.split('-');
      // Try with more specific code first if it has script (e.g. zh-Hans)
      let codeToUse = parts[0];
      if (parts[1] && parts[1].length > 2) {
        codeToUse = `${parts[0]}-${parts[1]}`;
      }

      const name = displayNames.of(codeToUse);
      if (name) return name;
    }
  } catch (e) { }

  // Fallback map
  const langMap: Record<string, string> = {
    'zh': 'Chinese',
    'en': 'English',
    'ja': 'Japanese',
    'ko': 'Korean',
    'fr': 'French',
    'de': 'German',
    'es': 'Spanish',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'it': 'Italian',
  };

  const base = langCode.split('-')[0].toLowerCase();
  return langMap[base] || langCode;
};

const formatLocation = (timezone: string | null) => {
  if (!timezone || timezone === 'UTC') return 'Global';

  // Asia/Shanghai -> Shanghai
  // America/New_York -> New York
  const parts = timezone.split('/');
  const city = parts[parts.length - 1];
  return city.replace(/_/g, ' ');
};

export const ProfileScreen = ({
  onItemPress,
  onToggleLike,
  onHistoryPress,
  onLikesPress
}: {
  onItemPress?: (id: string, items: FeedItem[]) => void;
  onToggleLike?: () => void;
  onHistoryPress?: () => void;
  onLikesPress?: () => void;
}) => {
  const { showAlert } = useAlert();
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
          // NEW: Show interests onboarding first
          setShowInterestsModal(true);
          setOnboardingName('');
        }
      }
    }
  }, [user]);

  const pickImage = async () => {
    try {
      // If not already editing, enter edit mode
      if (!isEditing) {
        setIsEditing(true);
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
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
      showAlert({
        title: 'Feature Unavailable',
        message: 'Image picker is not available in this environment. Please use a development build.'
      });
    }
  };

  const handleSave = async () => {
    if (displayName.trim().length < 2) {
      showAlert({
        title: 'Validation Error',
        message: 'Display Name must be at least 2 characters.'
      });
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
              showAlert({
                title: 'File too large',
                message: 'Profile photo must be under 5MB.'
              });
              setLoading(false);
              return;
            }

            // Upload
            finalPhotoUrl = await uploadImage(avatar);
          }
        } catch (uploadError: any) {
          showAlert({
            title: 'Upload Failed',
            message: 'Could not upload profile photo. Please try again.'
          });
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
      showAlert({
        title: 'Success',
        message: 'Profile updated'
      });
    } catch (error: any) {
      showAlert({
        title: 'Error',
        message: error.message || 'Failed to update profile'
      });
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
      showAlert({
        title: 'Invalid Name',
        message: 'Name must be at least 2 characters.'
      });
      return;
    }
    
    setLoading(true);
    try {
      await updateProfile({ displayName: onboardingName.trim() });
      setShowOnboarding(false);
      // showAlert({ title: 'Welcome!', message: `Hello, ${onboardingName}` });
    } catch (error: any) {
      showAlert({
        title: 'Error',
        message: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    showAlert({
      title: 'Log Out',
      message: 'Are you sure?',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout }
      ]
    });
  };

  const renderProfileContent = () => (
    <View style={styles.form}>
      {/* Selected Interests Display */}
      {!isEditing && (
        <View style={styles.interestsDisplay}>
          <View style={styles.interestsHeaderRow}>
            <Text style={styles.interestsLabel}>My Interests</Text>
            <Pressable
              style={styles.interestsUpdateSmall}
              onPress={() => setShowInterestsModal(true)}
            >
              <Text style={styles.interestsUpdateSmallText}>Update</Text>
            </Pressable>
          </View>
          
          {user?.interests && Object.keys(user.interests).filter(k => user.interests![k] !== 'none').length > 0 ? (
            <View style={styles.interestsGrid}>
              {Object.keys(user.interests)
                .filter(id => user.interests![id] !== 'none')
                .map(id => {
                  const tag = TAGS.find(t => t.id === id);
                  if (!tag) return null;
                  return (
                    <View key={id} style={styles.interestTag}>
                      <Text style={styles.interestEmoji}>{tag.emoji}</Text>
                      <Text style={styles.interestName}>{tag.name}</Text>
                    </View>
                  );
                })}
            </View>
          ) : (
            <Text style={styles.noInterestsText}>Please add your interests</Text>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
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
          initialInterests={user?.interests}
          onComplete={() => {
            setShowInterestsModal(false);
            // After interests are done, check if we need to show name onboarding
            if (!user?.displayName || (user?.userid && user?.displayName === user?.userid)) {
              if (/^\d{8}$/.test(user?.userid || '')) {
                setShowOnboarding(true);
              }
            }
          }}
        />
      </Modal>

      {/* Name Onboarding Modal */}
      <Modal
        visible={showOnboarding}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { }} // Prevent closing
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
              maxLength={9}
            />

            <Pressable
              style={[styles.button, styles.saveButton, { width: '100%', marginTop: 16 }]}
              onPress={handleOnboardingSubmit}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={colors.text} /> : (
                <Text style={[styles.buttonText, { color: colors.text }]}>Get Started</Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Header (Avatar & Name) - Always visible */}
      <View style={styles.header}>
        {/* Top Right Actions (Logout) */}
        <View style={styles.headerRight}>
          {!isEditing ? (
            <View style={styles.headerRightActions}>
              <Pressable 
                style={styles.headerLogoutButton} 
                onPress={handleLogout}
              >
                <LogOut size={20} color={colors.error} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.headerRightActions}>
              <Pressable 
                style={styles.headerReturnButton} 
                onPress={handleCancel}
              >
                <X size={20} color={colors.textSecondary} />
              </Pressable>
              <Pressable 
                style={[styles.headerActionButton, { backgroundColor: colors.primary, borderColor: colors.selectedBorder }]} 
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? <ActivityIndicator size="small" color={colors.text} /> : <Check size={20} color={colors.text} />}
              </Pressable>
            </View>
          )}
        </View>

        <Pressable onPress={pickImage} style={styles.avatarContainer}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={[styles.avatar, { backgroundColor: '#f0f0f0' }]} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <UserIcon size={40} color={colors.textMuted} />
            </View>
          )}
          
          <View style={styles.cameraButton}>
            <Camera size={16} color={colors.text} />
          </View>
        </Pressable>
        
        {/* Basic Info */}
        <View style={styles.headerInfo}>
          {!isEditing ? (
            <Pressable onPress={() => setIsEditing(true)} style={styles.nameRow}>
              <Text style={styles.name}>{displayName || 'User'}</Text>
              <View style={styles.inlineEditButton}>
                <Pencil size={12} color={colors.textSecondary} />
              </View>
            </Pressable>
          ) : (
            <View style={styles.editNameContainer}>
              <TextInput
                style={styles.editNameInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Name"
                maxLength={9}
                autoFocus
                onBlur={() => {
                  // Optional: auto-save or cancel on blur
                }}
              />
              <Pressable onPress={handleCancel} style={styles.editCancelButton}>
                <X size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          )}
          {!isEditing && user?.userid && (
            <Text style={styles.idText}>ID: {user.userid}</Text>
          )}
        </View>
      </View>

      {/* Content Area */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {!isEditing && (
          <View style={styles.profileQuickActions}>
            <Pressable style={styles.quickActionButton} onPress={onLikesPress}>
              <Heart size={20} color={colors.textSecondary} />
              <Text style={styles.quickActionText}>My Likes</Text>
            </Pressable>
            <View style={styles.quickActionDivider} />
            <Pressable style={styles.quickActionButton} onPress={onHistoryPress}>
              <HistoryIcon size={20} color={colors.textSecondary} />
              <Text style={styles.quickActionText}>History</Text>
            </Pressable>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 12,
    backgroundColor: colors.bg,
    position: 'relative',
  },
  headerRight: {
    position: 'absolute',
    top: 20,
    right: 16,
    zIndex: 10,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLeft: {
    position: 'absolute',
    top: 20,
    left: 16,
    flexDirection: 'column',
    gap: 8,
    zIndex: 10,
  },
  profileQuickActions: {
    flexDirection: 'row',
    backgroundColor: colors.bg, // Match background
    paddingVertical: 14,
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#B45309', // Deep Amber bottom line
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  quickActionDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#B45309', // Same Deep Amber
    alignSelf: 'center',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerActionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#B45309',
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerEditButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary, // Bright Yellow
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#B45309', // Deep Amber border
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  headerLogoutButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.error + '60', // Red outline
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerReturnButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    borderColor: colors.bg,
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
    marginTop: 8,
  },
  editNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 4,
    height: 40,
    borderWidth: 1,
    borderColor: colors.border,
  },
  editNameInput: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    minWidth: 80,
    paddingVertical: 0,
  },
  editCancelButton: {
    padding: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineEditButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 0,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  idText: {
    fontSize: 11,
    color: colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    overflow: 'hidden',
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
  bioHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    backgroundColor: colors.card,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.error + '40', // Soft red border
  },
  interestsButton: {
    backgroundColor: colors.primaryBg,
    borderWidth: 1,
    borderColor: '#B45309',
  },
  interestsDisplay: {
    marginTop: 10,
    gap: 10,
  },
  interestsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  interestsUpdateSmall: {
    backgroundColor: colors.bg, // Same as background
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B45309',
  },
  interestsUpdateSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
    textTransform: 'uppercase',
  },
  interestsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noInterestsText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#B45309',
  },
  interestEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  interestName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
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
    borderWidth: 1.5,
    borderColor: '#B45309',
    alignItems: 'center',
    marginVertical: 6,
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
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
    fontSize: 8,
    fontWeight: '700',
    color: '#B45309',
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 4,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  itemDate: {
    fontSize: 10,
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
