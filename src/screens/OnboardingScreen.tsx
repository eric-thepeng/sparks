/**
 * Onboarding Interest Selection Screen
 * Let users choose their topic preferences
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Sparkles, X } from 'lucide-react-native';
import { BUCKETS, InterestLevel } from '../data/buckets';
import { submitOnboarding } from '../api';
import { useRecommendation } from '../context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 8;
const CARD_WIDTH = (SCREEN_WIDTH - 48 - CARD_GAP) / 2;

// Yellow (Sunglow) 色彩系统 - Warm Stone/Grey Contrast
const colors = {
  primary: '#FFD166',      // Sunglow
  primaryLight: '#FFE5A0', // Pale Sunglow
  primaryDark: '#F4B350',  // Deep Sunglow
  primaryBg: '#FFF0C2',    // Light Amber/Cream
  accent: '#f43f5e',       // rose-500
  bg: '#F4F1E6',           // Distinct Sand background
  card: '#FFFDF5',         // Creamy White
  text: '#451a03',         // Amber 950
  textSecondary: '#78350f',// Amber 900
  textMuted: '#92400e',    // Amber 800
  border: '#E8E4D6',       // Sand Border
  success: '#22c55e',
  gold: '#f59e0b',
};

interface OnboardingScreenProps {
  /** Completion callback */
  onComplete: () => void;
  /** Show close button (for re-onboard mode) */
  showCloseButton?: boolean;
  /** Close callback */
  onClose?: () => void;
}

export function OnboardingScreen({ 
  onComplete, 
  showCloseButton = false,
  onClose 
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const { updateFromResponse } = useRecommendation();
  const [interests, setInterests] = useState<Record<string, InterestLevel>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Count selected items
  const selectedCount = Object.values(interests).filter(
    level => level === 'interested' || level === 'super_interested'
  ).length;

  // Toggle state: none → interested → super_interested → none
  const handleToggle = useCallback((bucketId: string) => {
    setInterests(prev => {
      const current = prev[bucketId] || 'none';
      let next: InterestLevel;
      
      switch (current) {
        case 'none':
          next = 'interested';
          break;
        case 'interested':
          next = 'super_interested';
          break;
        case 'super_interested':
          next = 'none';
          break;
        default:
          next = 'interested';
      }
      
      if (next === 'none') {
        const { [bucketId]: _, ...rest } = prev;
        return rest;
      }
      
      return { ...prev, [bucketId]: next };
    });
  }, []);

  // Submit
  const handleSubmit = useCallback(async () => {
    if (selectedCount === 0) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log('[Onboarding] Submitting interests:', interests);
      const response = await submitOnboarding(interests);
      console.log('[Onboarding] Success, response:', response);
      
      // 用响应中的 bucket_count 更新 debug panel 状态
      if (response && response.bucket_count) {
        updateFromResponse(response.bucket_count, response.click_count || 0);
      }
    } catch (err: any) {
      // If backend API not implemented, continue silently
      if (err?.status === 404) {
        console.warn('[Onboarding] API not implemented yet, continuing anyway');
      } else {
        console.warn('[Onboarding] Failed:', err);
      }
    } finally {
      setIsSubmitting(false);
      onComplete();
    }
  }, [interests, selectedCount, onComplete, updateFromResponse]);

  // Render single bucket card
  const renderBucketCard = (bucket: typeof BUCKETS[0]) => {
    const level = interests[bucket.id] || 'none';
    const isSelected = level !== 'none';
    const isSuperInterested = level === 'super_interested';

    return (
      <Pressable
        key={bucket.id}
        style={[
          styles.card,
          isSelected && styles.cardSelected,
          isSuperInterested && styles.cardSuper,
        ]}
        onPress={() => handleToggle(bucket.id)}
      >
        {/* Status indicator */}
        {isSelected && (
          <View style={[
            styles.checkBadge,
            isSuperInterested && styles.checkBadgeSuper,
          ]}>
            {isSuperInterested ? (
              <Sparkles size={10} color="#fff" />
            ) : (
              <Check size={10} color={colors.primary} />
            )}
          </View>
        )}
        
        {/* Emoji */}
        <Text style={styles.emoji}>{bucket.emoji}</Text>
        
        {/* Name */}
        <Text style={[
          styles.cardName,
          isSuperInterested && styles.cardNameSuper,
        ]}>
          {bucket.name}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
      {/* Close button (re-onboard mode) */}
      {showCloseButton && onClose && (
        <Pressable style={[styles.closeButton, { top: insets.top + 16 }]} onPress={onClose}>
          <X size={24} color={colors.text} />
        </Pressable>
      )}
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>✨</Text>
        <Text style={styles.title}>What interests you?</Text>
        <Text style={styles.subtitle}>
          Tap to select, tap again for super interested
        </Text>
      </View>

      {/* Bucket grid - no scroll */}
      <View style={styles.grid}>
        {BUCKETS.map(renderBucketCard)}
      </View>

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.selectedHint}>
          {selectedCount === 0 
            ? 'Select at least one topic' 
            : `${selectedCount} topic${selectedCount > 1 ? 's' : ''} selected`}
        </Text>
        
        <Pressable
          style={[
            styles.continueButton,
            selectedCount === 0 && styles.continueButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={selectedCount === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>
              Continue
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
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  headerEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  grid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    gap: CARD_GAP,
    alignContent: 'center',
  },
  card: {
    width: CARD_WIDTH,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    position: 'relative',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  cardSuper: {
    borderColor: colors.gold,
    backgroundColor: colors.primary,
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeSuper: {
    backgroundColor: colors.gold,
  },
  emoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  cardName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  cardNameSuper: {
    color: '#fff',
  },
  errorContainer: {
    marginHorizontal: 24,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  selectedHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  continueButton: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.border,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
