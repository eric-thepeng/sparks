/**
 * 帖子缓存 Context
 * 管理帖子缓存队列，支持增量加载和自动补充
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { fetchPosts } from '../api';
import { apiPostToFeedItem, FeedItem } from '../data';

// ============================================================
// 配置常量
// ============================================================

const INITIAL_DISPLAY_COUNT = 6;   // 初始显示数量
const CACHE_SIZE = 5;              // 缓存队列目标大小
const REFILL_THRESHOLD = 2;        // 缓存低于此值时触发补充
const FETCH_BATCH_SIZE = 5;        // 每次请求的帖子数量

// ============================================================
// 类型定义
// ============================================================

interface PostCacheState {
  displayedPosts: FeedItem[];  // 当前已显示的帖子
  cachedPosts: FeedItem[];     // 缓存队列（待显示）
  isLoading: boolean;          // 是否正在加载
  hasMore: boolean;            // 后端是否还有更多帖子
  error: string | null;        // 错误信息
}

interface PostCacheContextValue extends PostCacheState {
  /** 消费一个缓存帖子，添加到已显示列表 */
  consumePost: () => FeedItem | null;
  /** 消费多个缓存帖子 */
  consumeMultiple: (count: number) => FeedItem[];
  /** 获取所有帖子（不影响缓存队列） */
  fetchAllPosts: () => Promise<FeedItem[]>;
  /** 重新加载（清空并重新请求） */
  refetch: () => Promise<void>;
  /** 更新帖子的点赞状态 */
  updateLocalLike: (uid: string, isLiked: boolean, likeCount: number) => void;
  /** 从缓存中移除一个帖子（例如已删除） */
  removePost: (uid: string) => void;
  /** 缓存状态（用于 Debug） */
  cacheStatus: {
    displayedCount: number;
    cachedCount: number;
  };
}

// ============================================================
// Context
// ============================================================

const PostCacheContext = createContext<PostCacheContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

export function PostCacheProvider({ children }: { children: ReactNode }) {
  const [displayedPosts, setDisplayedPosts] = useState<FeedItem[]>([]);
  const [cachedPosts, setCachedPosts] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 已请求过的帖子 UID 集合，用于去重
  const seenUids = useRef<Set<string>>(new Set());

  // 是否正在补充缓存（防止重复请求）
  const isRefilling = useRef(false);

  /**
   * 从 API 获取帖子并转换为 FeedItem
   */
  const fetchAndConvert = useCallback(async (limit: number): Promise<FeedItem[]> => {
    const apiPosts = await fetchPosts(limit);
    return apiPosts.map((post, index) => apiPostToFeedItem(post, index));
  }, []);

  /**
   * 过滤掉已经见过的帖子
   */
  const filterNewPosts = useCallback((posts: FeedItem[]): FeedItem[] => {
    return posts.filter(post => {
      if (seenUids.current.has(post.uid)) {
        return false;
      }
      seenUids.current.add(post.uid);
      return true;
    });
  }, []);

  /**
   * 初始化加载
   */
  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const totalNeeded = INITIAL_DISPLAY_COUNT + CACHE_SIZE;
      const posts = await fetchAndConvert(totalNeeded);
      const newPosts = filterNewPosts(posts);


      // 分配到显示和缓存
      const displayed = newPosts.slice(0, INITIAL_DISPLAY_COUNT);
      const cached = newPosts.slice(INITIAL_DISPLAY_COUNT);

      setDisplayedPosts(displayed);
      setCachedPosts(cached);
      setHasMore(posts.length >= totalNeeded);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载失败';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAndConvert, filterNewPosts]);

  /**
   * 补充缓存
   */
  const refillCache = useCallback(async () => {
    if (isRefilling.current || isLoading || !hasMore) {
      return;
    }

    isRefilling.current = true;

    try {
      const posts = await fetchAndConvert(FETCH_BATCH_SIZE);
      const newPosts = filterNewPosts(posts);


      if (newPosts.length > 0) {
        setCachedPosts(prev => [...prev, ...newPosts]);
      }

      // 如果返回的帖子都是已见过的或数量不足，可能没有更多了
      if (posts.length < FETCH_BATCH_SIZE) {
        setHasMore(false);
      }
    } catch (err) {
      // 静默失败，不影响用户体验
    } finally {
      isRefilling.current = false;
    }
  }, [isLoading, hasMore, fetchAndConvert, filterNewPosts]);

  /**
   * 消费一个缓存帖子
   */
  const consumePost = useCallback((): FeedItem | null => {
    if (cachedPosts.length === 0) {
      return null;
    }

    const [post, ...remaining] = cachedPosts;
    setCachedPosts(remaining);
    setDisplayedPosts(prev => [...prev, post]);


    // 检查是否需要补充
    if (remaining.length < REFILL_THRESHOLD) {
      refillCache();
    }

    return post;
  }, [cachedPosts, refillCache]);

  /**
   * 消费多个缓存帖子
   */
  const consumeMultiple = useCallback((count: number): FeedItem[] => {
    const toConsume = Math.min(count, cachedPosts.length);
    if (toConsume === 0) {
      return [];
    }

    const consumed = cachedPosts.slice(0, toConsume);
    const remaining = cachedPosts.slice(toConsume);

    setCachedPosts(remaining);
    setDisplayedPosts(prev => [...prev, ...consumed]);


    // 检查是否需要补充
    if (remaining.length < REFILL_THRESHOLD) {
      refillCache();
    }

    return consumed;
  }, [cachedPosts, refillCache]);

  /**
   * 从缓存中移除一个帖子
   */
  const removePost = useCallback((uid: string) => {
    setDisplayedPosts(prev => prev.filter(item => item.uid !== uid));
    setCachedPosts(prev => prev.filter(item => item.uid !== uid));
  }, []);

  /**
   * 获取所有帖子（不影响缓存队列）
   */
  const fetchAllPosts = useCallback(async (): Promise<FeedItem[]> => {
    try {
      // 请求一个较大的数量以获取所有帖子
      const apiPosts = await fetchPosts(1000);
      return apiPosts.map((post, index) => apiPostToFeedItem(post, index));
    } catch (err) {
      return [];
    }
  }, []);

  /**
   * 重新加载
   */
  const refetch = useCallback(async () => {
    seenUids.current.clear();
    setDisplayedPosts([]);
    setCachedPosts([]);
    setHasMore(true);
    await initialize();
  }, [initialize]);

  /**
   * 更新帖子的点赞状态
   */
  const updateLocalLike = useCallback((uid: string, isLiked: boolean, likeCount: number) => {
    setDisplayedPosts(prev => prev.map(item =>
      item.uid === uid ? { ...item, isLiked, likes: likeCount } : item
    ));
    setCachedPosts(prev => prev.map(item =>
      item.uid === uid ? { ...item, isLiked, likes: likeCount } : item
    ));
  }, []);

  // 初始化
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 缓存状态
  const cacheStatus = {
    displayedCount: displayedPosts.length,
    cachedCount: cachedPosts.length,
  };

  const value: PostCacheContextValue = {
    displayedPosts,
    cachedPosts,
    isLoading,
    hasMore,
    error,
    consumePost,
    consumeMultiple,
    refetch,
    updateLocalLike,
    removePost,
    fetchAllPosts,
    cacheStatus,
  };

  return (
    <PostCacheContext.Provider value={value}>
      {children}
    </PostCacheContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function usePostCache(): PostCacheContextValue {
  const context = useContext(PostCacheContext);
  if (!context) {
    throw new Error('usePostCache must be used within PostCacheProvider');
  }
  return context;
}
