/**
 * Onboarding Interest Selection Screen
 * Let users choose their tag preferences
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings2, X } from 'lucide-react-native';
import { TAGS, InterestLevel } from '../data/buckets';
import { submitOnboarding } from '../api';
import { useRecommendation, useAuth } from '../context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;
const PADDING_HORIZONTAL = 24;

// Yellow (Sunglow) 色彩系统 - Warm Stone/Grey Contrast
const colors = {
  primary: '#FFD166',      // Sunglow
  primaryLight: '#FFE5A0', // Pale Sunglow
  primaryDark: '#F4B350',  // Deep Sunglow
  primaryBg: '#FFF0C2',    // Light Amber/Cream
  accent: '#f43f5e',       // rose-500
  bg: '#F4F1E6',           // Distinct Sand background
  card: '#FFFEF9',         // Lighter Creamy White
  text: '#451a03',         // Amber 950 - Darkest Brown
  textSecondary: '#78350f',// Amber 900
  textMuted: '#92400e',    // Amber 800
  border: '#E8E4D6',       // Sand Border
  success: '#22c55e',
  gold: '#f59e0b',
  selectedBorder: '#B45309', // Deep Amber for selected
};

interface OnboardingScreenProps {
  /** Completion callback */
  onComplete: () => void;
  /** Show close button (for re-onboard mode) */
  showCloseButton?: boolean;
  /** Close callback */
  onClose?: () => void;
  /** Initial interests from user profile */
  initialInterests?: Record<string, InterestLevel>;
}

export function OnboardingScreen({ 
  onComplete, 
  showCloseButton = false,
  onClose,
  initialInterests
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { updateFromResponse } = useRecommendation();
  const { user, updateProfile } = useAuth();
  
  // Initialize from props, then from user context, then empty
  const [interests, setInterests] = useState<Record<string, InterestLevel>>(initialInterests || user?.interests || {});
  
  // Track the order in which tags were selected
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);
  
  // Track the order of unselected tags
  const [unselectedOrder, setUnselectedOrder] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Effect to initialize orders based on interests
  useEffect(() => {
    const currentInterests = initialInterests || user?.interests || {};
    setInterests(currentInterests);
    
    const selected = Object.keys(currentInterests).filter(id => currentInterests[id] !== 'none');
    setSelectionOrder(selected);
    
    const unselected = TAGS.map(t => t.id).filter(id => !currentInterests[id] || currentInterests[id] === 'none');
    setUnselectedOrder(unselected);
  }, [initialInterests, user?.interests]);

  // Use selectionOrder to determine the display order of selected tags
  const selectedTags = useMemo(() => {
    return selectionOrder
      .map(id => TAGS.find(tag => tag.id === id))
      .filter((tag): tag is typeof TAGS[0] => !!tag && !!interests[tag.id] && interests[tag.id] !== 'none');
  }, [interests, selectionOrder]);

  // Use unselectedOrder to determine the display order of unselected tags
  const availableTags = useMemo(() => {
    return unselectedOrder
      .map(id => TAGS.find(tag => tag.id === id))
      .filter((tag): tag is typeof TAGS[0] => !!tag && (!interests[tag.id] || interests[tag.id] === 'none'));
  }, [interests, unselectedOrder]);

  const selectedCount = selectedTags.length;

  const handleToggle = useCallback((tagId: string) => {
    setInterests(prev => {
      const current = prev[tagId] || 'none';
      const next: InterestLevel = current === 'none' ? 'interested' : 'none';
      
      // Update selection order: add to end if selected, remove if deselected
      if (next === 'interested') {
        setSelectionOrder(order => [...order, tagId]);
        setUnselectedOrder(order => order.filter(id => id !== tagId));
      } else {
        setSelectionOrder(order => order.filter(id => id !== tagId));
        setUnselectedOrder(order => [...order, tagId]);
      }
      
      if (next === 'none') {
        const { [tagId]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [tagId]: next };
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (selectedCount === 0) return;
    
    setIsSubmitting(true);
    try {
      
      // 1. Submit tag interests to the backend (updates recommendation weights)
      const response = await submitOnboarding(interests);
      
      // 2. Update the local user profile state immediately
      // This ensures the profile page updates without re-login
      try {
        await updateProfile({ interests });
      } catch (profileErr) {
      }
      
      if (response && response.bucket_count) {
        updateFromResponse(response.bucket_count, response.click_count || 0);
      }
    } catch (err: any) {
      if (err?.status === 404) {
      } else {
      }
    } finally {
      setIsSubmitting(false);
      onComplete();
    }
  }, [interests, selectedCount, onComplete, updateFromResponse, updateProfile]);

  const renderTagCard = (tag: typeof TAGS[0], isSmall = false) => {
    const isSelected = !!interests[tag.id] && interests[tag.id] !== 'none';

    return (
      <Pressable
        key={tag.id}
        style={[
          styles.card,
          isSmall && styles.cardSmall,
        ]}
        onPress={() => handleToggle(tag.id)}
      >
        <View style={styles.cardContentInner}>
          <View style={[styles.emojiContainer, isSmall && styles.emojiContainerSmall]}>
            <Text style={[styles.emoji, isSmall && styles.emojiSmall]}>{tag.emoji}</Text>
          </View>
          <Text style={[
            styles.cardName,
            isSmall && styles.cardNameSmall,
            isSelected && !isSmall && styles.cardNameSelected
          ]}>
            {tag.name}
          </Text>
          {isSmall && (
            <X size={12} color={colors.textMuted} style={{ marginLeft: 4 }} />
          )}
        </View>
      </Pressable>
    );
  };

  const isAnySelected = selectedCount > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Pressable 
        style={[styles.closeButton, { top: insets.top + 16 }]} 
        onPress={onClose || onComplete}
      >
        <X size={24} color={colors.textSecondary} />
      </Pressable>
      
      <View style={styles.header}>
        <Settings2 size={32} color={colors.textSecondary} style={styles.headerIcon} />
        <Text style={styles.title}>Manage your interests</Text>
        <Text style={styles.subtitle}>
          Adjust anytime to modify personalized contents
        </Text>
      </View>

      {/* Selected Interests Area */}
      {selectedCount > 0 && (
        <View style={styles.selectedArea}>
          <Text style={styles.selectedTitle}>Selected Interests</Text>
          <View style={styles.selectedTagsContainer}>
            {selectedTags.map(tag => renderTagCard(tag, true))}
          </View>
        </View>
      )}

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {availableTags.map(tag => renderTagCard(tag))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.selectedHint}>
          {selectedCount === 0 
            ? 'Select at least one tag' 
            : `${selectedCount} tag${selectedCount > 1 ? 's' : ''} selected`}
        </Text>
        
        <Pressable
          style={[
            styles.continueButton,
            isAnySelected && styles.continueButtonActive,
            !isAnySelected && styles.continueButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isAnySelected || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={[
              styles.continueButtonText,
              isAnySelected ? { color: colors.text } : styles.continueButtonTextDisabled
            ]}>
              Save changes
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  headerIcon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  selectedArea: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  selectedTitle: {
    fontSize: 11,    fontWeight: '700',
    color: colors.textMuted,
    paddingHorizontal: 24,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: 8,
    paddingBottom: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING_HORIZONTAL,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 10,
    justifyContent: 'flex-start',
  },
  card: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: colors.card,
    borderRadius: 20, // Pill shape
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 4,
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardSmall: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20, // Pill shape
    borderWidth: 1,
    borderColor: colors.selectedBorder,
    backgroundColor: colors.primaryBg,
    elevation: 1,
    shadowOpacity: 0.05,
    shadowRadius: 1,
    shadowOffset: { width: 0, height: 1 },
  },
  cardSelected: {
    borderColor: colors.selectedBorder,
    backgroundColor: colors.primaryBg,
  },
  cardContentInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiContainer: {
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiContainerSmall: {
    marginRight: 4,
    backgroundColor: 'transparent',
  },
  emoji: {
    fontSize: 14,
  },
  emojiSmall: {
    fontSize: 12,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cardNameSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  cardNameSelected: {
    color: colors.text,
  },
  footer: {
    paddingHorizontal: PADDING_HORIZONTAL,
    paddingTop: 16,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selectedHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  continueButton: {
    height: 50,
    backgroundColor: colors.card,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  continueButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.selectedBorder,
    shadowColor: colors.selectedBorder,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  continueButtonDisabled: {
    backgroundColor: colors.card,
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
  continueButtonTextDisabled: {
    color: colors.textMuted,
  },
});
