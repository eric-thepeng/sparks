/**
 * 数据获取 Hooks
 * 使用 useState + useEffect 管理 API 数据
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchPosts, fetchPostById, fetchPostsPaginated, ApiPost, RequestStatus } from '../api';
import { apiPostToFeedItem, apiPostToPost, getFeedItems, getPost, FeedItem, Post } from '../data';

// ============================================================
// 数据源配置
// ============================================================

/**
 * 数据源枚举
 */
export enum DataSource {
  /** 使用后端 API */
  API = 'api',
  /** 使用本地测试数据（有完整图片） */
  LOCAL = 'local',
  /** 优先 API，失败时回退到本地 */
  API_WITH_FALLBACK = 'api-fallback',
}

/**
 * ⚙️ 当前数据源配置 - 在这里切换！
 * 
 * DataSource.API            - 使用后端 API
 * DataSource.LOCAL          - 使用本地测试数据（有完整图片）
 * DataSource.API_WITH_FALLBACK - 优先 API，失败时回退到本地
 */
export const CURRENT_DATA_SOURCE: DataSource = DataSource.API;

// ============================================================
// useFeedItems - 获取 Feed 列表
// ============================================================

interface UseFeedItemsResult {
  feedItems: FeedItem[];
  status: RequestStatus;
  error: string | null;
  refetch: () => void;
  updateLocalLike: (uid: string, isLiked: boolean, likeCount: number) => void;
}

export function useFeedItems(): UseFeedItemsResult {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const updateLocalLike = useCallback((uid: string, isLiked: boolean, likeCount: number) => {
    setFeedItems(prev => prev.map(item => 
      item.uid === uid ? { ...item, isLiked, likes: likeCount } : item
    ));
  }, []);

  const fetchData = useCallback(async () => {
    setStatus('loading');
    setError(null);

    // 使用本地数据
    if (CURRENT_DATA_SOURCE === DataSource.LOCAL) {
      const localItems = getFeedItems();
      setFeedItems(localItems);
      setStatus('success');
      console.log('[useFeedItems] Using local data, count:', localItems.length);
      return;
    }

    // 使用 API
    try {
      const apiPosts = await fetchPosts();
      const items = apiPosts.map((post, index) => apiPostToFeedItem(post, index));
      setFeedItems(items);
      setStatus('success');
      console.log('[useFeedItems] API success, count:', items.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取数据失败';
      console.error('[useFeedItems] API failed:', err);
      
      // API 失败时回退到本地数据
      if (CURRENT_DATA_SOURCE === DataSource.API_WITH_FALLBACK) {
        console.log('[useFeedItems] Falling back to local data');
        const localItems = getFeedItems();
        setFeedItems(localItems);
        setStatus('success');
        return;
      }
      
      setError(errorMessage);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    feedItems,
    status,
    error,
    refetch: fetchData,
    updateLocalLike,
  };
}

// ============================================================
// usePaginatedFeed - 分页获取 Feed 列表
// ============================================================

interface UsePaginatedFeedResult {
  feedItems: FeedItem[];
  status: RequestStatus;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export function usePaginatedFeed(pageSize: number = 20): UsePaginatedFeedResult {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchData = useCallback(async (reset: boolean = false) => {
    const currentOffset = reset ? 0 : offset;
    setStatus('loading');
    setError(null);

    try {
      const apiPosts = await fetchPostsPaginated(pageSize, currentOffset);
      const newItems = apiPosts.map((post, index) => 
        apiPostToFeedItem(post, currentOffset + index)
      );

      if (reset) {
        setFeedItems(newItems);
        setOffset(pageSize);
      } else {
        setFeedItems(prev => [...prev, ...newItems]);
        setOffset(prev => prev + pageSize);
      }

      setHasMore(newItems.length === pageSize);
      setStatus('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取数据失败';
      setError(errorMessage);
      setStatus('error');
      console.error('Failed to fetch paginated feed:', err);
    }
  }, [offset, pageSize]);

  useEffect(() => {
    fetchData(true);
  }, [pageSize]);

  const loadMore = useCallback(() => {
    if (status !== 'loading' && hasMore) {
      fetchData(false);
    }
  }, [fetchData, status, hasMore]);

  const refetch = useCallback(() => {
    setOffset(0);
    setHasMore(true);
    fetchData(true);
  }, [fetchData]);

  return {
    feedItems,
    status,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}

// ============================================================
// usePost - 获取单个帖子详情
// ============================================================

interface UsePostResult {
  post: Post | null;
  status: RequestStatus;
  error: string | null;
  refetch: () => void;
  updateLocalLike: (isLiked: boolean, likeCount: number) => void;
}

export function usePost(postId: string | null): UsePostResult {
  const [post, setPost] = useState<Post | null>(null);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const updateLocalLike = useCallback((isLiked: boolean, likeCount: number) => {
    setPost(prev => prev ? { ...prev, isLiked, likeCount } : null);
  }, []);

  const fetchData = useCallback(async () => {
    if (!postId) {
      setPost(null);
      setStatus('idle');
      return;
    }

    setStatus('loading');
    setError(null);

    // 使用本地数据
    if (CURRENT_DATA_SOURCE === DataSource.LOCAL) {
      const localPost = getPost(postId);
      if (localPost) {
        setPost(localPost);
        setStatus('success');
        console.log('[usePost] Using local data for:', postId);
      } else {
        setError('帖子不存在');
        setStatus('error');
      }
      return;
    }

    // 使用 API
    try {
      const apiPost = await fetchPostById(postId);
      
      // Safety check: Ensure apiPost is valid before converting
      if (!apiPost || (!apiPost.uid && !apiPost.platform_post_id)) {
        console.error('[usePost] API returned invalid post data:', apiPost);
        setError('POST_NOT_FOUND');
        setStatus('error');
        return;
      }

      console.log('[usePost] API response for:', postId, 'has pages:', 'pages' in apiPost ? (apiPost as any).pages?.length : 'N/A');
      const convertedPost = apiPostToPost(apiPost);
      console.log('[usePost] Converted post pages:', convertedPost.pages.length);
      setPost(convertedPost);
      setStatus('success');
      console.log('[usePost] API success for:', postId);
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : '获取帖子失败';
      console.error('[usePost] API failed:', err);
      
      // If post is not found (404), mark as error specifically
      if (err.status === 404) {
        setError('POST_NOT_FOUND');
        setStatus('error');
        return;
      }
      
      // API 失败时回退到本地数据
      if (CURRENT_DATA_SOURCE === DataSource.API_WITH_FALLBACK) {
        const localPost = getPost(postId);
        if (localPost) {
          console.log('[usePost] Falling back to local data for:', postId);
          setPost(localPost);
          setStatus('success');
          return;
        }
      }
      
      setError(errorMessage);
      setStatus('error');
    }
  }, [postId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    post,
    status,
    error,
    refetch: fetchData,
    updateLocalLike,
  };
}

