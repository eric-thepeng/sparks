/**
 * 推荐信号 Hook
 * 封装用户交互信号发送逻辑，用于推荐算法
 */

import { useRef, useCallback, useState } from 'react';
import { sendSignal as sendSignalApi, resetRecommendation as resetRecommendationApi } from '../api';
import { SignalType, BucketCount } from '../api/types';
import { useAuth } from '../context';

/**
 * 阅读进度追踪状态
 */
interface ReadProgressState {
  sentSecond: boolean;      // 是否已发送 READ_TO_SECOND
  sentAlmost: boolean;      // 是否已发送 READ_ALMOST_COMPLETE
}

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
 * useRecommendation Hook 返回值
 */
interface UseRecommendationResult {
  /** 发送点击信号 - 打开帖子时调用 */
  sendClick: (postId: string) => void;
  /** 发送点赞信号 - 点赞成功后调用 */
  sendLike: (postId: string) => void;
  /** 发送评论信号 - 评论成功后调用 */
  sendComment: (postId: string) => void;
  /** 发送收藏信号 - 收藏成功后调用 */
  sendSave: (postId: string) => void;
  /** 追踪阅读进度 - 翻页时调用，自动发送 READ_TO_SECOND 和 READ_ALMOST_COMPLETE */
  trackReadProgress: (postId: string, currentPage: number, totalPages: number) => void;
  /** 重置帖子的阅读进度追踪（切换帖子时调用） */
  resetProgress: (postId: string) => void;
  /** 推荐状态（用于 Debug Panel） */
  state: RecommendationState;
  /** 重置推荐状态（Debug 用） */
  resetRecommendation: () => Promise<void>;
  /** 是否正在重置 */
  isResetting: boolean;
}

/**
 * 推荐信号 Hook
 * 
 * 功能：
 * - 发送用户交互信号到后端（点击、点赞、评论、收藏、阅读进度）
 * - 自动去重，避免重复发送相同信号
 * - 静默失败，不影响用户体验
 * - 仅登录用户发送信号
 * - 追踪 bucket_count 用于 Debug Panel
 */
export function useRecommendation(): UseRecommendationResult {
  const { token } = useAuth();
  
  // 追踪已发送的 CLICK 信号，避免重复
  const sentClicks = useRef<Set<string>>(new Set());
  
  // 追踪每个帖子的阅读进度信号发送状态
  const readProgress = useRef<Map<string, ReadProgressState>>(new Map());

  // 推荐状态（用于 Debug Panel）
  const [state, setState] = useState<RecommendationState>({
    bucketCount: {},
    clickCount: 0,
    lastSignal: null,
  });

  // 重置状态
  const [isResetting, setIsResetting] = useState(false);

  /**
   * 内部发送信号方法
   * 静默失败，仅 log 错误
   * 返回响应中的 bucket_count
   */
  const sendSignalSilent = useCallback(async (postId: string, signalType: SignalType) => {
    if (!token) {
      // 未登录用户不发送信号
      return;
    }

    try {
      const response = await sendSignalApi(postId, signalType);
      
      // 更新状态
      if (response && response.bucket_count) {
        setState({
          bucketCount: response.bucket_count,
          clickCount: response.click_count || 0,
          lastSignal: {
            postId,
            signalType,
            timestamp: Date.now(),
          },
        });
      }
    } catch {
      // 静默失败
    }
  }, [token]);

  /**
   * 发送点击信号
   * 去重：同一帖子只发送一次
   */
  const sendClick = useCallback((postId: string) => {
    if (sentClicks.current.has(postId)) {
      return; // 已发送过，跳过
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
   * 
   * @param postId - 帖子 ID
   * @param currentPage - 当前页码 (1-based)
   * @param totalPages - 总页数
   * 
   * 触发条件：
   * - READ_TO_SECOND: currentPage >= 2
   * - READ_ALMOST_COMPLETE: currentPage >= totalPages * 0.75
   */
  const trackReadProgress = useCallback((postId: string, currentPage: number, totalPages: number) => {
    if (totalPages < 2) {
      // 单页内容，无需追踪
      return;
    }

    // 获取或初始化进度状态
    let progressState = readProgress.current.get(postId);
    if (!progressState) {
      progressState = { sentSecond: false, sentAlmost: false };
      readProgress.current.set(postId, progressState);
    }

    // 检查是否到达第二页
    if (currentPage >= 2 && !progressState.sentSecond) {
      progressState.sentSecond = true;
      sendSignalSilent(postId, SignalType.READ_TO_SECOND);
    }

    // 检查是否到达 3/4 进度
    const almostThreshold = Math.ceil(totalPages * 0.75);
    if (currentPage >= almostThreshold && !progressState.sentAlmost) {
      progressState.sentAlmost = true;
      sendSignalSilent(postId, SignalType.READ_ALMOST_COMPLETE);
    }
  }, [sendSignalSilent]);

  /**
   * 重置帖子的阅读进度追踪
   * 用于切换帖子时清理状态
   */
  const resetProgress = useCallback((postId: string) => {
    readProgress.current.delete(postId);
  }, []);

  /**
   * 重置推荐状态（Debug 用）
   * 清空 history + 重置 bucket 权重为默认值
   */
  const resetRecommendation = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsResetting(true);
    try {
      const response = await resetRecommendationApi();

      // 更新状态
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
    } catch (error) {
      throw error;
    } finally {
      setIsResetting(false);
    }
  }, [token]);

  return {
    sendClick,
    sendLike,
    sendComment,
    sendSave,
    trackReadProgress,
    resetProgress,
    state,
    resetRecommendation,
    isResetting,
  };
}
