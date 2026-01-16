/**
 * SavedContext - 保存帖子的状态管理
 * 
 * 功能：
 * - 管理用户保存的帖子列表
 * - 使用 AsyncStorage 本地持久化
 * - 预留后端 API 同步接口
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FeedItem, Post } from '../data';

// ============================================================
// 类型定义
// ============================================================

/** 保存的帖子信息（存储精简数据） */
export interface SavedPost {
  uid: string;
  title: string;
  topic: string;
  coverImageUri?: string; // 网络图片URI
  savedAt: string;        // ISO 时间字符串
  // 后端同步相关
  syncedToServer?: boolean;
  serverSavedId?: string;
}

/** 保存状态 */
export type SaveSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

/** Context 值类型 */
interface SavedContextValue {
  // 状态
  savedPosts: SavedPost[];
  isLoading: boolean;
  syncStatus: SaveSyncStatus;
  error: string | null;
  
  // 操作
  savePost: (post: Post | FeedItem) => Promise<void>;
  unsavePost: (uid: string) => Promise<void>;
  isPostSaved: (uid: string) => boolean;
  toggleSavePost: (post: Post | FeedItem) => Promise<boolean>; // 返回新状态
  clearAllSaved: () => Promise<void>;
  refreshSavedPosts: () => Promise<void>;
  
  // 后端同步预留接口
  syncToServer: () => Promise<void>;
  bindAccount: (userId: string, token: string) => Promise<void>;
}

// ============================================================
// Storage Keys
// ============================================================

const STORAGE_KEYS = {
  SAVED_POSTS: '@sparks/saved_posts',
  USER_ID: '@sparks/user_id',
  AUTH_TOKEN: '@sparks/auth_token',
  LAST_SYNC: '@sparks/last_sync',
};

// ============================================================
// Context 创建
// ============================================================

const SavedContext = createContext<SavedContextValue | undefined>(undefined);

// ============================================================
// Provider 组件
// ============================================================

interface SavedProviderProps {
  children: ReactNode;
}

export function SavedProvider({ children }: SavedProviderProps) {
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SaveSyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // 用户认证信息（预留）
  const [userId, setUserId] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // ============================================================
  // 初始化 - 从本地存储加载
  // ============================================================
  
  useEffect(() => {
    loadSavedPosts();
  }, []);

  const loadSavedPosts = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.SAVED_POSTS);
      if (stored) {
        const parsed: SavedPost[] = JSON.parse(stored);
        // 按保存时间倒序排列（最新的在前）
        parsed.sort((a, b) => 
          new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        );
        setSavedPosts(parsed);
      }
      
      // 加载用户认证信息（预留）
      const storedUserId = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (storedUserId) setUserId(storedUserId);
      if (storedToken) setAuthToken(storedToken);
      
    } catch (err) {
      console.error('Failed to load saved posts:', err);
      setError('Failed to load saved posts');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================
  // 持久化保存
  // ============================================================
  
  const persistSavedPosts = async (posts: SavedPost[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SAVED_POSTS, JSON.stringify(posts));
    } catch (err) {
      console.error('Failed to persist saved posts:', err);
      throw err;
    }
  };

  // ============================================================
  // 保存帖子
  // ============================================================
  
  const savePost = useCallback(async (post: Post | FeedItem) => {
    // 检查是否已保存
    if (savedPosts.some(p => p.uid === post.uid)) {
      return;
    }

    const newSavedPost: SavedPost = {
      uid: post.uid,
      title: post.title,
      topic: post.topic,
      coverImageUri: 'coverImage' in post && typeof post.coverImage === 'object' && 'uri' in post.coverImage 
        ? (post.coverImage as { uri: string }).uri 
        : undefined,
      savedAt: new Date().toISOString(),
      syncedToServer: false,
    };

    const updatedPosts = [newSavedPost, ...savedPosts];
    setSavedPosts(updatedPosts);
    
    try {
      await persistSavedPosts(updatedPosts);
      
      // 如果已登录，尝试同步到服务器（预留）
      if (userId && authToken) {
        syncSinglePost(newSavedPost);
      }
    } catch (err) {
      // 回滚
      setSavedPosts(savedPosts);
      setError('Failed to save, please try again');
    }
  }, [savedPosts, userId, authToken]);

  // ============================================================
  // 取消保存
  // ============================================================
  
  const unsavePost = useCallback(async (uid: string) => {
    const updatedPosts = savedPosts.filter(p => p.uid !== uid);
    const previousPosts = savedPosts;
    
    setSavedPosts(updatedPosts);
    
    try {
      await persistSavedPosts(updatedPosts);
      
      // 如果已登录，同步删除到服务器（预留）
      if (userId && authToken) {
        deleteSyncedPost(uid);
      }
    } catch (err) {
      // 回滚
      setSavedPosts(previousPosts);
      setError('Failed to unsave, please try again');
    }
  }, [savedPosts, userId, authToken]);

  // ============================================================
  // 检查是否已保存
  // ============================================================
  
  const isPostSaved = useCallback((uid: string): boolean => {
    return savedPosts.some(p => p.uid === uid);
  }, [savedPosts]);

  // ============================================================
  // 切换保存状态
  // ============================================================
  
  const toggleSavePost = useCallback(async (post: Post | FeedItem): Promise<boolean> => {
    const isSaved = isPostSaved(post.uid);
    
    if (isSaved) {
      await unsavePost(post.uid);
      return false;
    } else {
      await savePost(post);
      return true;
    }
  }, [isPostSaved, savePost, unsavePost]);

  // ============================================================
  // 清空所有保存
  // ============================================================
  
  const clearAllSaved = useCallback(async () => {
    const previousPosts = savedPosts;
    setSavedPosts([]);
    
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SAVED_POSTS);
    } catch (err) {
      setSavedPosts(previousPosts);
      setError('Failed to clear, please try again');
    }
  }, [savedPosts]);

  // ============================================================
  // 刷新保存列表
  // ============================================================
  
  const refreshSavedPosts = useCallback(async () => {
    await loadSavedPosts();
  }, []);

  // ============================================================
  // 后端同步预留接口
  // ============================================================
  
  /** 同步所有本地保存到服务器 */
  const syncToServer = useCallback(async () => {
    if (!userId || !authToken) {
      console.log('User not authenticated, skip sync');
      return;
    }

    setSyncStatus('syncing');
    
    try {
      // TODO: 实现后端 API 调用
      // const unsyncedPosts = savedPosts.filter(p => !p.syncedToServer);
      // await api.syncSavedPosts(userId, unsyncedPosts, authToken);
      
      // 模拟成功
      const syncedPosts = savedPosts.map(p => ({ ...p, syncedToServer: true }));
      setSavedPosts(syncedPosts);
      await persistSavedPosts(syncedPosts);
      
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      setSyncStatus('synced');
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncStatus('error');
      setError('Sync failed, please check your network');
    }
  }, [userId, authToken, savedPosts]);

  /** 绑定用户账号 */
  const bindAccount = useCallback(async (newUserId: string, newToken: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_ID, newUserId);
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
      setUserId(newUserId);
      setAuthToken(newToken);
      
      // 绑定后自动同步
      // await syncToServer();
    } catch (err) {
      console.error('Failed to bind account:', err);
      setError('Failed to bind account');
    }
  }, []);

  /** 同步单个帖子（内部方法） */
  const syncSinglePost = async (post: SavedPost) => {
    // TODO: 实现单个帖子同步
    console.log('TODO: Sync single post to server:', post.uid);
  };

  /** 删除服务器上的保存（内部方法） */
  const deleteSyncedPost = async (uid: string) => {
    // TODO: 实现删除同步
    console.log('TODO: Delete synced post from server:', uid);
  };

  // ============================================================
  // Context Value
  // ============================================================
  
  const value: SavedContextValue = {
    savedPosts,
    isLoading,
    syncStatus,
    error,
    savePost,
    unsavePost,
    isPostSaved,
    toggleSavePost,
    clearAllSaved,
    refreshSavedPosts,
    syncToServer,
    bindAccount,
  };

  return (
    <SavedContext.Provider value={value}>
      {children}
    </SavedContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useSaved(): SavedContextValue {
  const context = useContext(SavedContext);
  if (context === undefined) {
    throw new Error('useSaved must be used within a SavedProvider');
  }
  return context;
}

// 导出类型
export type { SavedContextValue };

