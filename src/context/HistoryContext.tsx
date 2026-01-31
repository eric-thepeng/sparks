import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post, FeedItem } from '../data';
import { config } from '../config';

// ============================================================
// Types
// ============================================================

export interface HistoryPost {
  uid: string;
  title: string;
  topic: string;
  coverImageUri?: string;
  viewedAt: string;
}

interface HistoryContextValue {
  history: HistoryPost[];
  addToHistory: (post: Post | FeedItem) => Promise<void>;
  removeFromHistory: (uid: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

const HistoryContext = createContext<HistoryContextValue | undefined>(undefined);

const STORAGE_KEY_PREFIX = '@sparks/history_';
const MAX_HISTORY_SIZE = 100; // Keep last 100 items

// ============================================================
// Provider
// ============================================================

export function HistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryPost[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Load history when user changes
  useEffect(() => {
    const init = async () => {
      const storedAuth = await AsyncStorage.getItem(config.authStorageKey);
      if (storedAuth) {
        try {
          const { user } = JSON.parse(storedAuth);
          if (user?.id) {
            setUserId(user.id);
            loadHistory(user.id);
            return;
          }
        } catch (e) {}
      }
      setUserId(null);
      setHistory([]);
    };
    init();
  }, []); // Basic init, realistically should listen to AuthContext but this matches SavedContext pattern

  const loadHistory = async (uid: string) => {
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${uid}`);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const addToHistory = useCallback(async (post: Post | FeedItem) => {
    if (!userId) return;

    // Call backend API to record history
    try {
      const { recordHistory } = await import('../api');
      await recordHistory(post.uid, 'post');
      console.log('[History] Successfully recorded to backend:', post.uid);
    } catch (error) {
      console.error('[History] Failed to record to backend:', error);
    }

    setHistory(prev => {
      // Remove if existing (to move to top)
      const filtered = prev.filter(p => p.uid !== post.uid);
      
      const newEntry: HistoryPost = {
        uid: post.uid,
        title: post.title,
        topic: post.topic,
        coverImageUri: 'coverImage' in post && typeof post.coverImage === 'object' && 'uri' in post.coverImage 
          ? (post.coverImage as { uri: string }).uri 
          : ('coverUrl' in post ? (post as any).coverUrl : undefined),
        viewedAt: new Date().toISOString(),
      };

      const newHistory = [newEntry, ...filtered].slice(0, MAX_HISTORY_SIZE);
      
      // Persist
      AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(newHistory));
      return newHistory;
    });
  }, [userId]);

  const removeFromHistory = useCallback(async (uid: string) => {
    if (!userId) return;
    setHistory(prev => {
      const newHistory = prev.filter(p => p.uid !== uid);
      AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(newHistory));
      return newHistory;
    });
  }, [userId]);

  const clearHistory = useCallback(async () => {
    if (!userId) return;
    setHistory([]);
    await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}${userId}`);
  }, [userId]);

  return (
    <HistoryContext.Provider value={{ history, addToHistory, removeFromHistory, clearHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

export function usePostHistory() {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('usePostHistory must be used within HistoryProvider');
  }
  return context;
}
