/**
 * 推荐状态 Context
 * 用于在组件间共享推荐算法状态
 */

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode, useEffect } from 'react';
import { sendSignal as sendSignalApi, resetRecommendation as resetRecommendationApi } from '../api';
import { SignalType, BucketCount } from '../api/types';
import { useAuth } from './AuthContext';

/**
 * 推荐状态
 */
export interface RecommendationState {
  bucketCount: BucketCount;
  clickCount: number;
  lastSignal: {
    postId: string;
    signalType: SignalType;
    timestamp: number;
  } | null;
}

/**
 * 阅读进度追踪状态
 */
interface ReadProgressState {
  sentSecond: boolean;
  sentAlmost: boolean;
}

/**
 * Context 值类型
 */
interface RecommendationContextValue {
  /** 推荐状态 */
  state: RecommendationState;
  /** 是否正在重置 */
  isResetting: boolean;
  /** 发送点击信号 */
  sendClick: (postId: string) => void;
  /** 发送点赞信号 */
  sendLike: (postId: string) => void;
  /** 发送评论信号 */
  sendComment: (postId: string) => void;
  /** 发送收藏信号 */
  sendSave: (postId: string) => void;
  /** 追踪阅读进度 */
  trackReadProgress: (postId: string, currentPage: number, totalPages: number) => void;
  /** 重置阅读进度追踪 */
  resetProgress: (postId: string) => void;
  /** 重置推荐状态 */
  resetRecommendation: () => Promise<void>;
  /** 从 API 响应更新状态 (用于 onboarding) */
  updateFromResponse: (bucketCount: BucketCount, clickCount: number) => void;
}

const RecommendationContext = createContext<RecommendationContextValue | null>(null);

/**
 * 推荐状态 Provider
 */
export function RecommendationProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  
  // Debug: 监控 token 变化
  useEffect(() => {
    console.log('[RecommendationProvider] Token changed:', token ? 'exists' : 'null');
  }, [token]);
  
  // 推荐状态
  const [state, setState] = useState<RecommendationState>({
    bucketCount: {},
    clickCount: 0,
    lastSignal: null,
  });

  // 重置状态
  const [isResetting, setIsResetting] = useState(false);

  // 追踪已发送的 CLICK 信号，避免重复
  const sentClicks = useRef<Set<string>>(new Set());
  
  // 追踪每个帖子的阅读进度信号发送状态
  const readProgress = useRef<Map<string, ReadProgressState>>(new Map());

  /**
   * 内部发送信号方法
   */
  const sendSignalSilent = useCallback(async (postId: string, signalType: SignalType) => {
    console.log('[Recommendation] sendSignalSilent called:', { postId, signalType, hasToken: !!token });
    
    if (!token) {
      console.log('[Recommendation] Skipped signal (not logged in):', signalType);
      return;
    }

    try {
      console.log('[Recommendation] Sending signal to API...');
      const response = await sendSignalApi(postId, signalType);
      console.log(`[Recommendation] Signal response:`, JSON.stringify(response, null, 2));
      
      // 更新状态 - 检查各种可能的响应格式
      if (response) {
        const bucketCount = response.bucket_count || response.bucketCount || {};
        const clickCount = response.click_count ?? response.clickCount ?? 0;
        
        console.log('[Recommendation] Updating state with:', { bucketCount, clickCount });
        
        setState({
          bucketCount,
          clickCount,
          lastSignal: {
            postId,
            signalType,
            timestamp: Date.now(),
          },
        });
      }
    } catch (error) {
      console.log(`[Recommendation] Failed to send signal ${signalType}:`, error);
    }
  }, [token]);

  /**
   * 发送点击信号（去重）
   */
  const sendClick = useCallback((postId: string) => {
    console.log('[Recommendation] sendClick called:', postId, 'already sent:', sentClicks.current.has(postId));
    if (sentClicks.current.has(postId)) {
      return;
    }
    sentClicks.current.add(postId);
    sendSignalSilent(postId, SignalType.CLICK);
  }, [sendSignalSilent]);

  /**
   * 发送点赞信号
   */
  const sendLike = useCallback((postId: string) => {
    sendSignalSilent(postId, SignalType.LIKE);
  }, [sendSignalSilent]);

  /**
   * 发送评论信号
   */
  const sendComment = useCallback((postId: string) => {
    sendSignalSilent(postId, SignalType.COMMENT);
  }, [sendSignalSilent]);

  /**
   * 发送收藏信号
   */
  const sendSave = useCallback((postId: string) => {
    sendSignalSilent(postId, SignalType.SAVE);
  }, [sendSignalSilent]);

  /**
   * 追踪阅读进度
   */
  const trackReadProgress = useCallback((postId: string, currentPage: number, totalPages: number) => {
    if (totalPages < 2) {
      return;
    }

    let progressState = readProgress.current.get(postId);
    if (!progressState) {
      progressState = { sentSecond: false, sentAlmost: false };
      readProgress.current.set(postId, progressState);
    }

    if (currentPage >= 2 && !progressState.sentSecond) {
      progressState.sentSecond = true;
      sendSignalSilent(postId, SignalType.READ_TO_SECOND);
    }

    const almostThreshold = Math.ceil(totalPages * 0.75);
    if (currentPage >= almostThreshold && !progressState.sentAlmost) {
      progressState.sentAlmost = true;
      sendSignalSilent(postId, SignalType.READ_ALMOST_COMPLETE);
    }
  }, [sendSignalSilent]);

  /**
   * 重置阅读进度追踪
   */
  const resetProgress = useCallback((postId: string) => {
    readProgress.current.delete(postId);
  }, []);

  /**
   * 重置推荐状态
   */
  const resetRecommendation = useCallback(async () => {
    if (!token) {
      console.log('[Recommendation] Cannot reset: not logged in');
      return;
    }

    setIsResetting(true);
    try {
      const response = await resetRecommendationApi();
      console.log('[Recommendation] Reset successful:', response);
      
      if (response && response.bucket_count) {
        setState({
          bucketCount: response.bucket_count,
          clickCount: response.click_count || 0,
          lastSignal: null,
        });
      }

      // 清空本地去重缓存
      sentClicks.current.clear();
      readProgress.current.clear();
    } catch (error: any) {
      // 使用 console.warn 而不是 console.error，避免触发 React Native 的红色错误屏幕
      console.warn('[Recommendation] Reset failed:', error);
      if (error?.status === 404) {
        console.warn('[Recommendation] Reset endpoint not found - backend may not have deployed yet');
      }
    } finally {
      setIsResetting(false);
    }
  }, [token]);

  /**
   * 从 API 响应更新状态 (用于 onboarding)
   */
  const updateFromResponse = useCallback((bucketCount: BucketCount, clickCount: number) => {
    console.log('[Recommendation] Updating state from response:', { bucketCount, clickCount });
    setState({
      bucketCount,
      clickCount,
      lastSignal: null,
    });
    // 清空本地去重缓存
    sentClicks.current.clear();
    readProgress.current.clear();
  }, []);

  const value: RecommendationContextValue = {
    state,
    isResetting,
    sendClick,
    sendLike,
    sendComment,
    sendSave,
    trackReadProgress,
    resetProgress,
    resetRecommendation,
    updateFromResponse,
  };

  return (
    <RecommendationContext.Provider value={value}>
      {children}
    </RecommendationContext.Provider>
  );
}

/**
 * 使用推荐状态 Hook
 */
export function useRecommendation(): RecommendationContextValue {
  const context = useContext(RecommendationContext);
  if (!context) {
    throw new Error('useRecommendation must be used within RecommendationProvider');
  }
  return context;
}
