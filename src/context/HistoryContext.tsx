import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Post, FeedItem } from '../data';
import { config } from '../config';
import { useAuth } from './AuthContext';

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
  const { token } = useAuth();
  const [history, setHistory] = useState<HistoryPost[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Load history when user changes
  useEffect(() => {
    const init = async () => {
      console.log('[HistoryProvider] Initializing history...');
      const storedAuth = await AsyncStorage.getItem(config.authStorageKey);
      if (storedAuth) {
        try {
          const parsedAuth = JSON.parse(storedAuth);
          const user = parsedAuth.user;
          if (user?.id) {
            console.log('[HistoryProvider] Found user ID:', user.id);
            setUserId(user.id);
            loadHistory(user.id);
            return;
          }
        } catch (e) {
          console.error('[HistoryProvider] Failed to parse auth storage:', e);
        }
      }
      console.log('[HistoryProvider] No user ID found, resetting history');
      setUserId(null);
      setHistory([]);
    };
    init();
  }, [token]); // Add token as dependency to re-init on login/logout

  const loadHistory = async (uid: string) => {
    console.log('[HistoryProvider] Loading history for user UID:', uid);
    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEY_PREFIX}${uid}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[HistoryProvider] Loaded items from storage:', parsed.length);
        setHistory(parsed);
      } else {
        console.log('[HistoryProvider] No stored history found for this user');
      }
    } catch (e) {
      console.error('Failed to load history', e);
    }
  };

  const addToHistory = useCallback(async (post: Post | FeedItem) => {
    if (!userId) return;

    console.log('[History] addToHistory called for:', post.uid);

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
      
      // Persist locally
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
