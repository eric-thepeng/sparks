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
import { savePostApi, unsavePostApi, fetchSavedPostsApi, ApiPost, ApiRichPost } from '../api';
import { config } from '../config';

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
  // 初始化 - 监听 AuthContext (通过 AsyncStorage 检查)
  // ============================================================
  
  useEffect(() => {
    // Initial load
    const init = async () => {
       const storedAuth = await AsyncStorage.getItem(config.authStorageKey);
       let currentUserId = null;
       let currentToken = null;

       if (storedAuth) {
         try {
           const { user, token } = JSON.parse(storedAuth);
           if (user && user.id) currentUserId = user.id;
           if (token) currentToken = token;
         } catch (e) {
           // ignore parse error
         }
       }

       setUserId(currentUserId);
       setAuthToken(currentToken);
       loadSavedPosts(currentUserId);
    };
    init();
  }, []);

  // 监听 Token 变化，重新加载或绑定
  useEffect(() => {
    const checkAuth = async () => {
       const storedAuth = await AsyncStorage.getItem(config.authStorageKey);
       let currentUserId = null;
       let currentToken = null;

       if (storedAuth) {
         try {
           const { user, token } = JSON.parse(storedAuth);
           if (user && user.id) currentUserId = user.id;
           if (token) currentToken = token;
         } catch (e) {
            // ignore
         }
       }
       
       // If user changed (login or logout or switch)
       if (currentUserId !== userId) {
         setUserId(currentUserId);
         setAuthToken(currentToken);
         
         // Reload posts for new user (or clear if null)
         await loadSavedPosts(currentUserId);
         
         // If logged in, sync
         if (currentUserId && currentToken) {
           setTimeout(() => syncToServer(), 500);
         }
       } else if (currentToken !== authToken) {
         // Just token changed
         setAuthToken(currentToken);
       }
    };
    
    const interval = setInterval(checkAuth, 1000);
    return () => clearInterval(interval);
  }, [userId, authToken]); // Depend on local state to detect diffs

  const loadSavedPosts = async (currentUserId: string | null) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // If no user, clear posts (or load guest posts if we supported that)
      if (!currentUserId) {
        setSavedPosts([]);
        setIsLoading(false);
        return;
      }

      const key = `${STORAGE_KEYS.SAVED_POSTS}_${currentUserId}`;
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        const parsed: SavedPost[] = JSON.parse(stored);
        parsed.sort((a, b) => 
          new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        );
        setSavedPosts(parsed);
      } else {
        setSavedPosts([]);
      }
      
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
  
  const persistSavedPosts = async (posts: SavedPost[], currentUserId: string | null) => {
    if (!currentUserId) return;
    try {
      const key = `${STORAGE_KEYS.SAVED_POSTS}_${currentUserId}`;
      await AsyncStorage.setItem(key, JSON.stringify(posts));
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
      coverImageUri: 
        ('coverImageUrl' in post && post.coverImageUrl) ? post.coverImageUrl :
        ('coverImage' in post && typeof post.coverImage === 'object' && 'uri' in post.coverImage) 
          ? (post.coverImage as { uri: string }).uri 
          : undefined,
      savedAt: new Date().toISOString(),
      syncedToServer: false,
    };

    console.log('[SavedContext] Saving post:', JSON.stringify(newSavedPost, null, 2));

    const updatedPosts = [newSavedPost, ...savedPosts];
    setSavedPosts(updatedPosts);
    
    try {
      await persistSavedPosts(updatedPosts, userId);
      
      // 如果已登录，尝试同步到服务器
      if (authToken) {
        await savePostApi(newSavedPost.uid);
        // Mark as synced
        const syncedPosts = updatedPosts.map(p => 
          p.uid === newSavedPost.uid ? { ...p, syncedToServer: true } : p
        );
        setSavedPosts(syncedPosts);
        persistSavedPosts(syncedPosts, userId);
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
      await persistSavedPosts(updatedPosts, userId);
      
      // 如果已登录，同步删除到服务器
      if (authToken) {
        await unsavePostApi(uid);
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
      if (userId) {
         await AsyncStorage.removeItem(`${STORAGE_KEYS.SAVED_POSTS}_${userId}`);
      }
    } catch (err) {
      setSavedPosts(previousPosts);
      setError('Failed to clear, please try again');
    }
  }, [savedPosts]);

  // ============================================================
  // 刷新保存列表
  // ============================================================
  
  const refreshSavedPosts = useCallback(async () => {
    await loadSavedPosts(userId);
  }, [userId]);

  // ============================================================
  // 后端同步预留接口
  // ============================================================
  
  /** 同步所有本地保存到服务器 */
  const syncToServer = useCallback(async () => {
    if (!authToken) {
      console.log('User not authenticated, skip sync');
      return;
    }

    setSyncStatus('syncing');
    
    try {
      // 1. Fetch remote saved posts
      const remoteSavedPosts = await fetchSavedPostsApi();
      console.log('[SavedContext] Remote saved posts:', JSON.stringify(remoteSavedPosts, null, 2));
      
      // 2. Convert remote posts to SavedPost format
      // All posts are RichPost format
      const convertedRemotePosts: SavedPost[] = remoteSavedPosts.map(p => {
        const post = p as ApiRichPost;
        const uid = post.uid || (post as any).platform_post_id;
        const title = post.title;
        const topic = post.topic || post.bucket_key || 'General';
        const coverUri = post.cover_image?.url;
        
        return {
          uid,
          title,
          topic,
          coverImageUri: coverUri,
          savedAt: new Date().toISOString(),
          syncedToServer: true,
          serverSavedId: uid 
        };
      });

      // 3. Merge Strategy: Server is source of truth, but we can try to upload local unsynced ones?
      // For now, let's just use Server list + Local unsynced ones that are NOT in server list.
      
      // Current implementation simplified: Just use server list. 
      // If we want to support offline saving and syncing later, we'd iterate local `!syncedToServer` and call savePostApi.
      
      // Sync local posts that haven't been synced yet
      const unsyncedLocalPosts = savedPosts.filter(p => !p.syncedToServer);
      for (const localPost of unsyncedLocalPosts) {
         // Check if already in remote list to avoid double add
         if (!convertedRemotePosts.some(rp => rp.uid === localPost.uid)) {
            try {
              await savePostApi(localPost.uid);
              localPost.syncedToServer = true;
              convertedRemotePosts.unshift(localPost); // Add to our new list
            } catch (e) {
              console.error('Failed to sync local post to server:', localPost.uid);
            }
         }
      }

      setSavedPosts(convertedRemotePosts);
      await persistSavedPosts(convertedRemotePosts, userId);
      
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      setSyncStatus('synced');
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncStatus('error');
      setError('Sync failed, please check your network');
    }
  }, [authToken, savedPosts]);

  /** 绑定用户账号 */
  const bindAccount = useCallback(async (newUserId: string, newToken: string) => {
    try {
      // No longer need to manually set keys, AuthContext handles it.
      // We just update local state to trigger sync
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

