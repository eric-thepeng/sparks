/**
 * Onboarding Interest Selection Screen
 * Let users choose their tag preferences
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings2, X } from 'lucide-react-native';
import { TAGS, InterestLevel } from '../data/buckets';
import { submitOnboarding } from '../api';
import { useRecommendation } from '../context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
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
  text: '#451a03',         // Amber 950
  textSecondary: '#78350f',// Amber 900
  textMuted: '#92400e',    // Amber 800
  border: '#E8E4D6',       // Sand Border
  success: '#22c55e',
  gold: '#f59e0b',
  selectedBorder: '#B45309', // Deep Amber for selected
};

export function OnboardingScreen({ 
  onComplete, 
  showCloseButton = false,
  onClose 
}: {
  onComplete: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { updateFromResponse } = useRecommendation();
  
  const [interests, setInterests] = useState<Record<string, InterestLevel>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCount = Object.values(interests).filter(
    level => level === 'interested' || level === 'super_interested'
  ).length;

  const handleToggle = useCallback((tagId: string) => {
    setInterests(prev => {
      const current = prev[tagId] || 'none';
      const next: InterestLevel = current === 'none' ? 'interested' : 'none';
      
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
      const response = await submitOnboarding(interests);
      if (response && response.bucket_count) {
        updateFromResponse(response.bucket_count, response.click_count || 0);
      }
    } catch (err: any) {
      console.warn('[Onboarding] Failed:', err);
    } finally {
      setIsSubmitting(false);
      onComplete();
    }
  }, [interests, selectedCount, onComplete, updateFromResponse]);

  const renderTagCard = (tag: typeof TAGS[0]) => {
    const isSelected = !!interests[tag.id] && interests[tag.id] !== 'none';

    return (
      <Pressable
        key={tag.id}
        style={[
          styles.card,
          isSelected && styles.cardSelected,
        ]}
        onPress={() => handleToggle(tag.id)}
      >
        <View style={styles.cardContentInner}>
          <View style={styles.emojiContainer}>
            <Text style={styles.emoji}>{tag.emoji}</Text>
          </View>
          <Text style={[
            styles.cardName,
            isSelected && styles.cardNameSelected
          ]}>
            {tag.name}
          </Text>
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
        <X size={28} color={colors.textSecondary} />
      </Pressable>
      
      <View style={styles.header}>
        <Settings2 size={40} color={colors.textSecondary} style={styles.headerIcon} />
        <Text style={styles.title}>Manage your interests</Text>
        <Text style={styles.subtitle}>
          Adjust anytime to modify personalized contents
        </Text>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {TAGS.map(renderTagCard)}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
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
            <ActivityIndicator color={isAnySelected ? colors.text : '#9CA3AF'} />
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
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 40,
  },
  headerIcon: {
    marginBottom: 20,
    opacity: 0.6,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 17,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: PADDING_HORIZONTAL,
    paddingBottom: 40,
    gap: CARD_GAP,
    justifyContent: 'flex-start',
  },
  card: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 4,
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardSelected: {
    borderColor: colors.selectedBorder,
    backgroundColor: colors.primaryBg,
    shadowOpacity: 0.2,
    elevation: 4,
  },
  cardContentInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiContainer: {
    width: 32,
    height: 32,
    backgroundColor: colors.bg,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: {
    fontSize: 20,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  cardNameSelected: {
    color: colors.text,
  },
  footer: {
    paddingHorizontal: PADDING_HORIZONTAL,
    paddingTop: 20,
    backgroundColor: colors.bg,
  },
  continueButton: {
    height: 56,
    backgroundColor: colors.card,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
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
    fontSize: 18,
    fontWeight: '800',
  },
  continueButtonTextDisabled: {
    color: colors.textMuted,
  },
});
