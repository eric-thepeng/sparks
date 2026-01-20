/**
 * useSavedPosts Hook
 * 
 * 封装保存帖子的操作，提供便捷的 API
 * 预留后端接口和账号绑定功能
 */

import { useCallback, useMemo } from 'react';
import { useSaved, SavedPost } from '../context/SavedContext';
import { FeedItem, Post, getPostCover } from '../data';

// ============================================================
// 类型定义
// ============================================================

interface UseSavedPostsResult {
  // 保存的帖子列表
  savedPosts: SavedPost[];
  savedCount: number;
  
  // 状态
  isLoading: boolean;
  isEmpty: boolean;
  error: string | null;
  
  // 操作
  save: (post: Post | FeedItem) => Promise<void>;
  unsave: (uid: string) => Promise<void>;
  toggle: (post: Post | FeedItem) => Promise<boolean>;
  isSaved: (uid: string) => boolean;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // 转换方法 - 将 SavedPost 转为 FeedItem 用于展示
  toFeedItems: () => FeedItem[];
}

// ============================================================
// Hook 实现
// ============================================================

export function useSavedPosts(): UseSavedPostsResult {
  const {
    savedPosts,
    isLoading,
    error,
    savePost,
    unsavePost,
    toggleSavePost,
    isPostSaved,
    clearAllSaved,
    refreshSavedPosts,
  } = useSaved();

  // 计算是否为空
  const isEmpty = useMemo(() => savedPosts.length === 0, [savedPosts]);
  
  // 保存数量
  const savedCount = savedPosts.length;

  // 将 SavedPost 转换为 FeedItem 用于展示
  const toFeedItems = useCallback((): FeedItem[] => {
    return savedPosts.map((saved, index) => {
      // 尝试获取本地封面图
      const localCover = getPostCover(saved.uid);
      
      return {
        uid: saved.uid,
        title: saved.title,
        topic: saved.topic,
        coverImage: localCover || {
          uri: saved.coverImageUri || `https://via.placeholder.com/400x500/4f46e5/ffffff?text=${encodeURIComponent(saved.title.slice(0, 10))}`,
        },
        likes: 0, // 保存的帖子不显示点赞数
        isLiked: false,
        comments: 0,
        user: {
          id: 'saved',
          name: '已保存',
          avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=saved',
        },
      };
    });
  }, [savedPosts]);

  return {
    savedPosts,
    savedCount,
    isLoading,
    isEmpty,
    error,
    save: savePost,
    unsave: unsavePost,
    toggle: toggleSavePost,
    isSaved: isPostSaved,
    clearAll: clearAllSaved,
    refresh: refreshSavedPosts,
    toFeedItems,
  };
}

// ============================================================
// 后端同步相关 Hook（预留）
// ============================================================

interface UseSyncResult {
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncToServer: () => Promise<void>;
  bindAccount: (userId: string, token: string) => Promise<void>;
}

export function useSavedSync(): UseSyncResult {
  const { syncStatus, syncToServer, bindAccount } = useSaved();
  
  return {
    syncStatus,
    syncToServer,
    bindAccount,
  };
}

