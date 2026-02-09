/**
 * 帖子缓存 Context
 * 管理帖子缓存队列，支持增量加载和自动补充
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { fetchPosts, fetchPostsPaginated } from '../api';
import { apiPostToFeedItem, FeedItem } from '../data';

// ============================================================
// 配置常量
// ============================================================

const INITIAL_DISPLAY_COUNT = 20;  // 首屏显示 20 条
const INITIAL_FETCH_SIZE = 20;    // 首请求只拉 20 条，响应更快，再后台补
const CACHE_SIZE = 50;             // 大缓存，快速滚动不露空
const REFILL_THRESHOLD = 45;       // 缓存≤45 就补，早补才不露空
const FETCH_BATCH_SIZE = 40;       // 每次补 40 条

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
  // 分页：下次请求使用的 offset，避免重复拉同一批
  const nextOffsetRef = useRef(0);

  /**
   * 从 API 获取帖子并转换为 FeedItem（带 offset 分页）
   */
  const fetchAndConvertPaginated = useCallback(async (limit: number, offset: number): Promise<FeedItem[]> => {
    const apiPosts = await fetchPostsPaginated(limit, offset);
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
   * 初始化加载（offset=0 第一页）
   */
  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    nextOffsetRef.current = 0;

    try {
      const firstFetchSize = INITIAL_FETCH_SIZE;
      const posts = await fetchAndConvertPaginated(firstFetchSize, 0);
      nextOffsetRef.current = posts.length;
      const newPosts = filterNewPosts(posts);

      const displayed = newPosts.slice(0, INITIAL_DISPLAY_COUNT);
      const cached = newPosts.slice(INITIAL_DISPLAY_COUNT);

      setDisplayedPosts(displayed);
      setCachedPosts(cached);
      setHasMore(posts.length >= firstFetchSize || newPosts.length < INITIAL_DISPLAY_COUNT);
      // effect 会因 cache 低立刻触发 refill，下一页并行拉

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载失败';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAndConvertPaginated, filterNewPosts]);

  /**
   * 补充缓存（用 offset 拉下一页，避免重复）
   */
  const refillCache = useCallback(async () => {
    if (isRefilling.current || isLoading || !hasMore) {
      return;
    }

    isRefilling.current = true;
    const offset = nextOffsetRef.current;

    try {
      const posts = await fetchAndConvertPaginated(FETCH_BATCH_SIZE, offset);
      nextOffsetRef.current = offset + posts.length;
      const newPosts = filterNewPosts(posts);

      if (newPosts.length > 0) {
        setCachedPosts(prev => {
          const existingUids = new Set(prev.map(p => p.uid));
          const uniqueNewPosts = newPosts.filter(p => !existingUids.has(p.uid));
          return [...prev, ...uniqueNewPosts];
        });
      }

      if (posts.length < FETCH_BATCH_SIZE) {
        setHasMore(false);
      }
    } catch (err) {
      // 静默失败，不影响用户体验
    } finally {
      isRefilling.current = false;
    }
  }, [isLoading, hasMore, fetchAndConvertPaginated, filterNewPosts]);

  // 缓存一低就主动补；首屏很少时也补（0 条缓存也算「低」）
  useEffect(() => {
    if (isLoading) return;
    const cacheLow = cachedPosts.length <= REFILL_THRESHOLD;
    if (hasMore && cacheLow) refillCache();
  }, [cachedPosts.length, isLoading, hasMore, refillCache]);

  /**
   * 消费一个缓存帖子
   */
  const consumePost = useCallback((): FeedItem | null => {
    // 检查是否需要补充 (Check before consuming to ensure we don't get stuck)
    if (cachedPosts.length <= REFILL_THRESHOLD) {
      refillCache();
    }

    if (cachedPosts.length === 0) {
      // If empty, mark as pending so it gets consumed automatically when available
      pendingConsumptionRef.current += 1;
      refillCache();
      return null;
    }

    const [post, ...remaining] = cachedPosts;
    setCachedPosts(remaining);
    setDisplayedPosts(prev => {
      // Deduplicate: check if post already exists in displayedPosts
      if (prev.some(p => p.uid === post.uid)) {
        return prev;
      }
      return [...prev, post];
    });

    return post;
  }, [cachedPosts, refillCache]);

  // Pending consumption count (how many items we wanted but couldn't get because cache was empty)
  const pendingConsumptionRef = useRef(0);

  /**
   * 消费多个缓存帖子
   */
  const consumeMultiple = useCallback((count: number): FeedItem[] => {
    if (cachedPosts.length <= REFILL_THRESHOLD) {
      refillCache();
    }

    // 缓存很少时每次最多取 3 条，避免一次掏空、露空等 refill
    const cap = cachedPosts.length <= 8 ? 3 : count;
    const toConsume = Math.min(cap, cachedPosts.length);
    const needed = count - toConsume;

    // If we need more than we have, mark it as pending
    if (needed > 0) {
      pendingConsumptionRef.current += needed;
      refillCache(); // Ensure refill is triggered
    }

    if (toConsume === 0) {
      return [];
    }

    const consumed = cachedPosts.slice(0, toConsume);
    const remaining = cachedPosts.slice(toConsume);

    setCachedPosts(remaining);
    setDisplayedPosts(prev => {
      // Deduplicate: filter out posts that already exist in displayedPosts
      const existingUids = new Set(prev.map(p => p.uid));
      const uniqueConsumed = consumed.filter(p => !existingUids.has(p.uid));
      return [...prev, ...uniqueConsumed];
    });

    return consumed;
  }, [cachedPosts, refillCache]);

  // Effect to handle pending consumption when cache updates
  useEffect(() => {
    if (pendingConsumptionRef.current > 0 && cachedPosts.length > 0) {
      const count = pendingConsumptionRef.current;
      const toConsume = Math.min(count, cachedPosts.length);
      
      if (toConsume > 0) {
        const consumed = cachedPosts.slice(0, toConsume);
        const remaining = cachedPosts.slice(toConsume);
        
        setCachedPosts(remaining);
        setDisplayedPosts(prev => {
          const existingUids = new Set(prev.map(p => p.uid));
          const uniqueConsumed = consumed.filter(p => !existingUids.has(p.uid));
          return [...prev, ...uniqueConsumed];
        });
        
        pendingConsumptionRef.current -= toConsume;
        
        // If we still need more or cache is low, refill again
        if (remaining.length < REFILL_THRESHOLD || pendingConsumptionRef.current > 0) {
          refillCache();
        }
      }
    }
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
      const items = apiPosts.map((post, index) => apiPostToFeedItem(post, index));
      
      // Deduplicate by UID
      const seen = new Set<string>();
      return items.filter(item => {
        if (seen.has(item.uid)) return false;
        seen.add(item.uid);
        return true;
      });
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
