/**
 * 数据获取 Hooks
 * 使用 useState + useEffect 管理 API 数据
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchPosts, fetchPostById, fetchPostsPaginated, ApiPost, RequestStatus } from '../api';
import { apiPostToFeedItem, apiPostToPost, FeedItem, Post } from '../data';

// ============================================================
// useFeedItems - 获取 Feed 列表
// ============================================================

interface UseFeedItemsResult {
  feedItems: FeedItem[];
  status: RequestStatus;
  error: string | null;
  refetch: () => void;
}

export function useFeedItems(): UseFeedItemsResult {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const apiPosts = await fetchPosts();
      const items = apiPosts.map((post, index) => apiPostToFeedItem(post, index));
      setFeedItems(items);
      setStatus('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取数据失败';
      setError(errorMessage);
      setStatus('error');
      console.error('Failed to fetch feed items:', err);
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
}

export function usePost(postId: string | null): UsePostResult {
  const [post, setPost] = useState<Post | null>(null);
  const [status, setStatus] = useState<RequestStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!postId) {
      setPost(null);
      setStatus('idle');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const apiPost = await fetchPostById(postId);
      const convertedPost = apiPostToPost(apiPost);
      setPost(convertedPost);
      setStatus('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '获取帖子失败';
      setError(errorMessage);
      setStatus('error');
      console.error('Failed to fetch post:', err);
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
  };
}

