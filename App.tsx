/**
 * Sparks - 小红书风格
 * 瀑布流信息流 + 帖子详情 + 翻页阅读 + 保存功能
 */
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Dimensions,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Share,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { PanGestureHandler, State, PanGestureHandlerStateChangeEvent, GestureHandlerRootView, FlatList as GHFlatList, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Heart,
  ChevronLeft,
  Search,
  LayoutGrid,
  Bookmark,
  BookmarkCheck,
  FileText,
  User,
  Sparkles,
  Share2,
  Pencil,
  X,
  Send,
  Trash2,
  Clock,
  BookmarkPlus,
  Bug,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
} from 'lucide-react-native';

// 数据层
import {
  getFeedItems,
  getPost,
  getPostCover,
  getPostImage,
  getPostCoverImage,
  getBlockImage,
  FeedItem,
  Post,
  PostPage,
  ContentBlock
} from './src/data';

import {
  fetchComments,
  createComment,
  likeItem,
  unlikeItem,
  getMyHistory,
  getMyLikes,
  clearHistory
} from './src/api';
import { Comment, ProfileItem } from './src/api/types';

// Hooks
import { useFeedItems, usePost, useSavedPosts } from './src/hooks';

// Context
import { SavedProvider, useSaved, NotesProvider, useNotes, AuthProvider, useAuth, RecommendationProvider, useRecommendation, PostCacheProvider, usePostCache, HistoryProvider, usePostHistory } from './src/context';

// Screens
import { AuthScreen } from './src/screens/AuthScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLUMN_GAP = 8;
const CARD_WIDTH = (SCREEN_WIDTH - 24 - COLUMN_GAP) / 2;

// 封面图原始尺寸 928x1152
const COVER_ASPECT_RATIO = 928 / 1152; // ≈ 0.806
const CARD_IMAGE_HEIGHT = CARD_WIDTH / COVER_ASPECT_RATIO;

const HEADER_HEIGHT = 60;
const BOTTOM_BAR_HEIGHT = 64;

// 启用 LayoutAnimation
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Indigo 色彩系统
const colors = {
  primary: '#4f46e5',      // indigo-600
  primaryLight: '#818cf8', // indigo-400
  primaryDark: '#3730a3',  // indigo-800
  primaryBg: '#eef2ff',    // indigo-50
  accent: '#f43f5e',       // rose-500 for hearts
  bg: '#f8fafc',
  card: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
};

/**
 * 格式化主题名称：替换下划线为空格并应用 Title Case
 */
const formatTopicName = (topic: string) => {
  if (!topic) return '';
  return topic
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Helper for relative time formatting
const formatRelativeTime = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Check if it's the same calendar day (just in case of timezone edge cases)
    if (date.getDate() === now.getDate()) {
      return `Today ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return 'Yesterday';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    // Fallback to date for older items
    return date.toLocaleDateString();
  }
};

// ============================================================
// 顶部导航 Tab
// ============================================================
function Header({
  onSearchPress,
  onBack,
  title = "Discover"
}: {
  onSearchPress?: () => void;
  onBack?: () => void;
  title?: string;
}) {
  return (
    <View style={styles.header}>
      <View style={{ width: 40 }}>
        {onBack ? (
          <Pressable style={styles.headerIcon} onPress={onBack}>
            <ChevronLeft size={24} color={colors.text} />
          </Pressable>
        ) : onSearchPress ? (
          <Pressable style={styles.headerIcon} onPress={onSearchPress}>
            <Search size={22} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.topTabs}>
        <View style={styles.topTab}>
          <Text style={styles.topTabTextActive} numberOfLines={1}>{title}</Text>
        </View>
      </View>

      <View style={{ width: 40 }}>
        {onBack && onSearchPress && (
          <Pressable style={styles.headerIcon} onPress={onSearchPress}>
            <Search size={22} color={colors.text} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ============================================================
// 底部导航
// ============================================================
function BottomNav({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const insets = useSafeAreaInsets();

  const items = [
    { key: 'explore', icon: Sparkles, label: '', isMain: true },
    { key: 'collection', icon: LayoutGrid, label: 'Collection' },
    { key: 'saved', icon: Bookmark, label: 'Saved' },
    { key: 'me', icon: User, label: 'Me' },
  ];

  return (
    <View style={[styles.bottomNav, { paddingBottom: insets.bottom }]}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.key;

        if (item.isMain) {
          return (
            <Pressable
              key={item.key}
              style={[styles.mainButton, isActive && styles.mainButtonActive]}
              onPress={() => onTabChange(item.key)}
            >
              <Icon size={26} color="#fff" />
            </Pressable>
          );
        }

        return (
          <Pressable
            key={item.key}
            style={styles.navItem}
            onPress={() => onTabChange(item.key)}
          >
            <Icon
              size={22}
              color={isActive ? colors.primary : colors.textMuted}
            />
            <Text style={[
              styles.navLabel,
              isActive && styles.navLabelActive
            ]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ============================================================
// Feed 卡片
// ============================================================
function FeedCard({
  item,
  onPress,
  index = 0,
}: {
  item: FeedItem;
  onPress: () => void;
  index?: number;
}) {
  const { token, logout } = useAuth();
  const [isLiked, setIsLiked] = useState(item.isLiked);
  const [likeCount, setLikeCount] = useState(item.likes);
  const [isLiking, setIsLiking] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;

  // Entry Animation
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Stagger animation based on index
    const delay = index * 100; // 100ms per item
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 6,
        tension: 50,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Sync with item prop if it changes (e.g. pull to refresh)
  useEffect(() => {
    setIsLiked(item.isLiked);
    setLikeCount(item.likes);
  }, [item.isLiked, item.likes]);

  const handleLike = async () => {
    if (isLiking) return;

    if (!token) {
      Alert.alert(
        'Login Required',
        'Please log in to like posts.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLiking(true);

    // Optimistic Update
    const prevIsLiked = isLiked;
    const prevLikeCount = likeCount;

    setIsLiked(!prevIsLiked);
    setLikeCount(prev => prevIsLiked ? prev - 1 : prev + 1);

    // Animation
    Animated.sequence([
      Animated.spring(likeScale, {
        toValue: 1.2,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(likeScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
      }),
    ]).start();

    try {
      if (prevIsLiked) {
        await unlikeItem(item.uid, 'post');
      } else {
        await likeItem(item.uid, 'post');
      }
    } catch (error: any) {
      // Rollback
      setIsLiked(prevIsLiked);
      setLikeCount(prevLikeCount);
      console.error('Like failed', error);

      if (error?.status === 401) {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
        logout();
      }
    } finally {
      setIsLiking(false);
    }
  };

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Pressable style={styles.card} onPress={onPress}>
        {/* 封面图 - 保持原始宽高比 */}
        <Image
          source={item.coverImage}
          style={[styles.cardImage, { height: CARD_IMAGE_HEIGHT }]}
          contentFit="cover"
          transition={200}
        />

        {/* 内容 */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={5}>
            {item.title}
          </Text>

          {/* 底部：话题标签 + 点赞 */}
          <View style={styles.cardFooter}>
            <View style={styles.topicInfo}>
              <Text style={styles.topicName} numberOfLines={1}>
                #{formatTopicName(item.topic)}
              </Text>
            </View>

            <Pressable style={styles.likeButton} onPress={handleLike} disabled={isLiking}>
              <Animated.View style={{ transform: [{ scale: likeScale }] }}>
                <Heart
                  size={14}
                  color={isLiked ? colors.accent : colors.textMuted}
                  fill={isLiked ? colors.accent : 'transparent'}
                />
              </Animated.View>
              <Text style={[
                styles.likeCount,
                isLiked && { color: colors.accent }
              ]}>
                {likeCount}
              </Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ============================================================
// 瀑布流 Feed
// ============================================================
function MasonryFeed({
  items,
  onItemPress
}: {
  items: FeedItem[];
  onItemPress: (uid: string) => void;
}) {
  // 分配到两列
  const leftColumn: FeedItem[] = [];
  const rightColumn: FeedItem[] = [];

  items.forEach((item, index) => {
    if (index % 2 === 0) {
      leftColumn.push(item);
    } else {
      rightColumn.push(item);
    }
  });

  return (
    <View style={styles.masonry}>
      {/* 左列 */}
      <View style={styles.column}>
        {leftColumn.map((item, index) => (
          <FeedCard
            key={item.uid}
            item={item}
            onPress={() => onItemPress(item.uid)}
            index={index * 2} // Approximate original index for staggering
          />
        ))}
      </View>

      {/* 右列 */}
      <View style={styles.column}>
        {rightColumn.map((item, index) => (
          <FeedCard
            key={item.uid}
            item={item}
            onPress={() => onItemPress(item.uid)}
            index={index * 2 + 1} // Approximate original index for staggering
          />
        ))}
      </View>
    </View>
  );
}

// ============================================================
// 帖子阅读器 - 连续滚动
// ============================================================
// 评论区组件
// ============================================================
function CommentSection({ postId }: { postId: string }) {
  const { user, token, logout } = useAuth();
  const { sendComment } = useRecommendation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sortBy, setSortBy] = useState<'time' | 'likes'>('time');

  // Load comments on mount
  useEffect(() => {
    loadComments();
  }, [postId]);

  const loadComments = async () => {
    setIsLoading(true);
    try {
      const data = await fetchComments(postId);
      setComments(data);
    } catch (err) {
      console.log('Failed to load comments (API might not be ready yet)');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !user) return;

    setIsSending(true);
    try {
      const newComment = await createComment(postId, { content: inputText.trim() });
      setComments([newComment, ...comments]);
      setInputText('');
      // Send COMMENT signal for recommendation
      sendComment(postId);
    } catch (err) {
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setIsSending(false);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!token) {
      Alert.alert('Login Required', 'Please log in to like comments.');
      return;
    }

    const commentIndex = comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return;

    const comment = comments[commentIndex];
    const wasLiked = !!comment.is_liked;

    // Optimistic Update
    const updatedComments = [...comments];
    updatedComments[commentIndex] = {
      ...comment,
      is_liked: !wasLiked,
      like_count: (comment.like_count || 0) + (wasLiked ? -1 : 1)
    };
    setComments(updatedComments);

    try {
      if (wasLiked) {
        await unlikeItem(commentId, 'comment');
      } else {
        await likeItem(commentId, 'comment');
      }
    } catch (error: any) {
      // Rollback
      setComments(comments);
      console.error('Comment like failed', error);
      if (error?.status === 401) {
        Alert.alert('Session Expired', 'Please log in again.');
        logout();
      }
    }
  };

  const sortedComments = useMemo(() => {
    const sorted = [...comments];
    if (sortBy === 'likes') {
      return sorted.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
    }
    return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [comments, sortBy]);

  if (isLoading) {
    return (
      <View style={styles.commentsLoading}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Loading comments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.commentSection}>
      <View style={styles.commentHeaderRow}>
        <Text style={styles.commentHeader}>Comments ({comments.length})</Text>
        <View style={styles.commentSortContainer}>
          <Pressable
            onPress={() => setSortBy('time')}
            style={[styles.sortButton, sortBy === 'time' && styles.sortButtonActive]}
          >
            <Text style={[styles.sortButtonText, sortBy === 'time' && styles.sortButtonTextActive]}>Newest</Text>
          </Pressable>
          <View style={styles.sortDivider} />
          <Pressable
            onPress={() => setSortBy('likes')}
            style={[styles.sortButton, sortBy === 'likes' && styles.sortButtonActive]}
          >
            <Text style={[styles.sortButtonText, sortBy === 'likes' && styles.sortButtonTextActive]}>Top</Text>
          </Pressable>
        </View>
      </View>

      {/* Comment Input */}
      {user ? (
        <View style={styles.commentInputRow}>
          <Image source={{ uri: user.photoUrl || undefined }} style={styles.commentAvatarSmall} />
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment..."
            value={inputText}
            onChangeText={setInputText}
            maxLength={200}
            multiline
          />
          {inputText.length > 0 && (
            <Pressable onPress={handleSend} disabled={isSending} style={styles.commentSendButton}>
              <Send size={20} color={colors.primary} />
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.commentLoginPrompt}>
          <Text style={{ color: colors.textSecondary }}>Log in to comment</Text>
        </View>
      )}

      {/* Comment List */}
      <View style={styles.commentList}>
        {sortedComments.map((item) => (
          <View key={item.id} style={styles.commentItem}>
            <Image source={{ uri: item.user?.photoUrl || undefined }} style={styles.commentAvatar} />
            <View style={styles.commentContent}>
              <View style={styles.commentUserRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.commentUser}>{item.user?.displayName || 'User'}</Text>
                  <Text style={styles.commentTime}>
                    {formatRelativeTime(item.created_at)}
                  </Text>
                </View>
                <Pressable
                  style={styles.commentLikeContainer}
                  onPress={() => handleLikeComment(item.id)}
                >
                  <Heart
                    size={14}
                    color={item.is_liked ? colors.accent : colors.textMuted}
                    fill={item.is_liked ? colors.accent : 'transparent'}
                  />
                  {item.like_count !== undefined && item.like_count > 0 && (
                    <Text style={[styles.commentLikeCount, item.is_liked && { color: colors.accent }]}>
                      {item.like_count}
                    </Text>
                  )}
                </Pressable>
              </View>
              <Text style={styles.commentText}>{item.content}</Text>
            </View>
          </View>
        ))}
        {comments.length === 0 && (
          <Text style={styles.noComments}>No comments yet. Be the first!</Text>
        )}
      </View>
    </View>
  );
}

// ============================================================
// --- Markdown Helper ---
const renderMarkdownText = (text: string = '', baseStyle: any, isCaption: boolean = false) => {
  if (!text) return null;

  if (isCaption) {
    // For captions, the backend wraps the whole thing in *...* or **...** to mark it as a caption.
    // We should strip these and render with caption style (italic).
    let processedText = text.trim();
    if (processedText.startsWith('**') && processedText.endsWith('**')) {
      processedText = processedText.slice(2, -2);
    } else if (processedText.startsWith('*') && processedText.endsWith('*')) {
      processedText = processedText.slice(1, -1);
    }

    // Support internal bold if needed
    const parts = processedText.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return (
      <Text style={baseStyle} allowFontScaling={false}>
        {parts.map((part, i) => {
          if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('*') && part.endsWith('*'))) {
            const content = part.startsWith('**') ? part.slice(2, -2) : part.slice(1, -1);
            return (
              <Text key={i} style={[baseStyle, { fontWeight: 'bold', fontStyle: 'normal' }]}>
                {content}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  }

  // Regular text logic
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

  return (
    <Text style={baseStyle} allowFontScaling={false}>
      {parts.map((part, i) => {
        // Handle bold (** or *)
        if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('*') && part.endsWith('*'))) {
          const content = part.startsWith('**') ? part.slice(2, -2) : part.slice(1, -1);
          return (
            <Text key={i} style={[baseStyle, { fontWeight: 'bold', color: colors.text }]}>
              {content}
            </Text>
          );
        }
        return part;
      })}
    </Text>
  );
};

// ============================================================
// Page Item Component (for Vertical FlatList)
// ============================================================
type ReaderItem =
  | { type: 'page'; page: PostPage; index: number };

const PageItem = React.memo((props: {
  item: ReaderItem;
  post: Post;
  isVisible: boolean;
  containerHeight: number;
  isLastPage: boolean;
  bottomBarHeight: number;
  hasReadEnd?: boolean;
  onRequestNext?: () => void;
  onRequestPrev?: () => void;
  onPageCompleted?: () => void;
  onSwipeEnableChange?: (canSwipe: boolean) => void;
}) => {
  const {
    item,
    post,
    isVisible,
    containerHeight,
    isLastPage,
    bottomBarHeight,
    hasReadEnd,
    onRequestNext,
    onRequestPrev,
    onPageCompleted,
    onSwipeEnableChange,
  } = props;
  const isFirstPage = item.index === 0;
  const opacity = useRef(new Animated.Value(isFirstPage ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(isFirstPage ? 0 : 50)).current;
  const [revealed, setRevealed] = useState(isFirstPage);

  const insets = useSafeAreaInsets();

  const lastY = useRef(0);
  const dragDir = useRef<'up' | 'down' | null>(null);
  const lastImageLayout = useRef<{ y: number; height: number } | null>(null);
  const endMarkerLayout = useRef<number | null>(null);
  const imageRectsRef = useRef<Map<string, { y: number; height: number }>>(new Map());
  const navBlockedForGesture = useRef(false);
  const imageLayoutSetRef = useRef<Set<number>>(new Set());
  const imageCount = useMemo(
    () => item.page.blocks.filter((block) => block.type === 'image').length,
    [item.page.blocks]
  );
  const loadedImagesRef = useRef(0);
  const contentHeightRef = useRef(0);
  const contentStableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollMetricsRef = useRef<{ y: number; contentHeight: number; viewportHeight: number }>({
    y: 0,
    contentHeight: 0,
    viewportHeight: 0,
  });

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isTouchingImage = useRef(false);
  const overscrollTriggered = useRef(false); // Latch for one-shot trigger

  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    onSwipeEnableChange?.(isComplete);
  }, [isComplete, onSwipeEnableChange]);

  // Initial lock for short content check
  useEffect(() => {
    // If not complete, ensure swipe is disabled
    if (!isComplete) {
      onSwipeEnableChange?.(false);
    }
  }, []);

  const readyIndicatorOpacity = useRef(new Animated.Value(0)).current;
  const [imagesLoaded, setImagesLoaded] = useState(imageCount === 0);
  // Track content stability separately from reveal
  const [heightStable, setHeightStable] = useState(false);
  const [contentStable, setContentStable] = useState(false);
  const [imageLayoutsMeasured, setImageLayoutsMeasured] = useState(imageCount === 0);
  const [contentReadyFallback, setContentReadyFallback] = useState(false);
  const completedOnceRef = useRef(false);
  const [isLastImageFullyVisible, setIsLastImageFullyVisible] = useState(true);

  // Robustly calculate bottom padding
  // Header is ~50, Bottom bar is ~60
  // insets.bottom is usually 34 on iPhone X+, 0 on older phones
  // Add extra buffer (24) to ensure the last line clears the bottom bar
  const bottomClearance = (bottomBarHeight || 60) + insets.bottom + 24;

  const contentReady = (imagesLoaded && imageLayoutsMeasured && contentStable) || contentReadyFallback;

  useEffect(() => {
    // Reveal content only when:
    // 1. Page is visible in swiper (isVisible)
    // 2. Not already revealed
    // 3. Content is fully ready (images loaded & layouts measured)
    if (isVisible && !revealed && contentReady) {
      setRevealed(true);
      imageRectsRef.current.clear(); // Clear rects on reveal/reset
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible, revealed, contentReady]);

  // Update ready indicator based on hasReadEnd
  useEffect(() => {
    if (isComplete) { // Use isComplete for visibility
      Animated.timing(readyIndicatorOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(readyIndicatorOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isComplete]);

  useEffect(() => {
    setImagesLoaded(imageCount === 0);
    loadedImagesRef.current = 0;
    imageLayoutSetRef.current = new Set();
    setImageLayoutsMeasured(imageCount === 0);
    setContentReadyFallback(false);
  }, [imageCount]);

  // Moved contentReady definition up


  const fadeHint = (to: number) => {
    Animated.timing(hintOpacity, {
      toValue: to,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const isNavigationZone = () =>
    touchStartX.current < 44 ||
    touchStartX.current > SCREEN_WIDTH - 44 ||
    touchStartY.current > SCREEN_HEIGHT * 0.75;

  const markContentUnstable = () => {
    // Update stability for reveal
    if (contentStable) setContentStable(false);

    // Reset completion gate immediately if content changes
    setIsComplete(false);
    setHeightStable(false);

    if (contentStableTimerRef.current) {
      clearTimeout(contentStableTimerRef.current);
    }
    contentStableTimerRef.current = setTimeout(() => {
      setContentStable(true);
      setHeightStable(true); // Content is now stable

      // Fallback: if images are slow, allow readiness after a short stable window
      // Only trigger fallback if we haven't revealed yet to avoid jumping
      if (!revealed) {
        setContentReadyFallback(true);
      }
    }, 300); // 300ms debounce as requested
  };

  const lastImageIndex = useMemo(() => {
    for (let i = item.page.blocks.length - 1; i >= 0; i -= 1) {
      if (item.page.blocks[i]?.type === 'image') return i;
    }
    return -1;
  }, [item.page.blocks]);

  useEffect(() => {
    // If there are no images, treat last image as fully visible
    if (lastImageIndex === -1) {
      setIsLastImageFullyVisible(true);
      lastImageLayout.current = null;
    } else {
      setIsLastImageFullyVisible(false);
    }
  }, [lastImageIndex]);

  const updateLastImageVisibility = (scrollY: number, viewportHeight: number) => {
    if (!lastImageLayout.current) return;
    const imageTop = lastImageLayout.current.y;
    const imageBottom = imageTop + lastImageLayout.current.height;
    const viewTop = scrollY;
    const viewBottom = scrollY + viewportHeight;

    const fullyVisible = imageTop >= viewTop && imageBottom <= viewBottom;
    if (fullyVisible !== isLastImageFullyVisible) {
      setIsLastImageFullyVisible(fullyVisible);
    }
  };

  const updateBottomPaddingVisibility = (scrollY: number, viewportHeight: number) => {
    // Keep this function if needed for other UI updates
  };

  // Render content block helper
  const renderBlock = (block: ContentBlock, idx: number, pageIdx: number) => {
    const key = `${pageIdx}-${idx}`;

    // Skip h1 on the first page since we render the title in the header UI
    if (pageIdx === 0 && block.type === 'h1') return null;

    // Skip empty paragraphs or horizontal rules that were captured as text
    // Handles ---, ----, etc.
    if (block.type === 'paragraph' && (!block.text || block.text.trim().match(/^---+$/))) return null;

    switch (block.type) {
      case 'h1':
        return <Text key={key} style={styles.blockH1}>{block.text}</Text>;
      case 'h2':
        return <Text key={key} style={styles.blockH2}>{block.text}</Text>;
      case 'h3':
        return <Text key={key} style={styles.blockH3}>{block.text}</Text>;
      case 'paragraph':
        return (
          <View key={key} style={{ width: '100%', minHeight: 1 }}>
            {renderMarkdownText(block.text, styles.blockParagraph)}
          </View>
        );
      case 'image':
        const imageSource = getBlockImage(post, block) || getPostImage(post.uid, block.ref || '');
        if (!imageSource) return null;
        return (
          <View
            key={key}
            style={styles.imageBlockContainer}
            onLayout={(e) => {
              const { y, height } = e.nativeEvent.layout;
              // Track image layout for gesture blocking
              imageRectsRef.current.set(key, { y, height });

              if (idx === lastImageIndex) {
                lastImageLayout.current = { y, height };
              }
              if (!imageLayoutSetRef.current.has(idx)) {
                imageLayoutSetRef.current.add(idx);
                if (imageLayoutSetRef.current.size >= imageCount) {
                  setImageLayoutsMeasured(true);
                }
              }
            }}
            onTouchStart={() => { isTouchingImage.current = true; }}
            onTouchEnd={() => { isTouchingImage.current = false; }}
            onTouchCancel={() => { isTouchingImage.current = false; }}
          >
            <Image
              source={imageSource}
              style={styles.blockImage}
              contentFit="cover"
              transition={300}
              onLoadEnd={() => {
                loadedImagesRef.current += 1;
                if (loadedImagesRef.current >= imageCount) {
                  setImagesLoaded(true);
                }
              }}
            />
            {block.caption && renderMarkdownText(block.caption, styles.blockImageCaption, true)}
          </View>
        );
      case 'bullets':
        return (
          <View key={key} style={styles.blockBullets}>
            {block.items?.map((item, bulletIdx) => (
              <View key={bulletIdx} style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <View style={{ flex: 1 }}>
                  {renderMarkdownText(item, styles.bulletText)}
                </View>
              </View>
            ))}
          </View>
        );
      case 'quote':
        return (
          <View key={key} style={styles.blockQuote}>
            <View style={{ flex: 1 }}>
              {renderMarkdownText(block.text, styles.quoteText)}
            </View>
          </View>
        );
      case 'spacer':
        const spacerHeight = block.size === 'sm' ? 12 : block.size === 'lg' ? 36 : 24;
        return <View key={key} style={{ height: spacerHeight }} />;
      default:
        return null;
    }
  };

  const isDragging = useRef(false);

  // Regular Page - Improved layout to prevent "stuck" pages and ensure smooth snapping
  return (
    <Animated.View style={{
      opacity,
      transform: [{ translateY }],
      height: containerHeight,
      alignSelf: 'stretch',
      overflow: 'visible', // Ensure no clipping
    }}>
      <GHScrollView
        directionalLockEnabled={true}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
        style={{ flex: 1 }}
        scrollEnabled={true}
        bounces={true}
        overScrollMode="always"
        scrollEventThrottle={16}
        onTouchStart={(e) => {
          touchStartX.current = e.nativeEvent.pageX;
          touchStartY.current = e.nativeEvent.pageY;

          // Check if touch started on an image
          const touchY = e.nativeEvent.locationY;
          const scrollY = lastScrollMetricsRef.current.y;
          const absoluteY = scrollY + touchY;

          let hitImage = false;
          for (const rect of imageRectsRef.current.values()) {
            if (absoluteY >= rect.y && absoluteY <= rect.y + rect.height) {
              hitImage = true;
              break;
            }
          }
          navBlockedForGesture.current = hitImage;
        }}
        onScrollBeginDrag={() => {
          isDragging.current = true;
        }}
        onScrollEndDrag={(e) => {
          // Reset latch on drag release
          overscrollTriggered.current = false;
          isDragging.current = false;
        }}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          const y = contentOffset.y;
          dragDir.current = y > lastY.current ? "up" : "down";
          lastY.current = y;
          lastScrollMetricsRef.current = {
            y,
            contentHeight: contentSize.height,
            viewportHeight: layoutMeasurement.height,
          };

          updateLastImageVisibility(y, layoutMeasurement.height);

          // Calculate short content status for UI hints
          const isShortContent = contentSize.height <= layoutMeasurement.height + 10;

          // Calculate bottom padding visibility (End of Content Marker)
          const markerY = endMarkerLayout.current || 99999;
          const viewportHeight = layoutMeasurement.height;
          const threshold = 12; // Robust threshold (8-16px)
          const bottomPaddingVisible = markerY <= y + viewportHeight - threshold;

          if (!isComplete && bottomPaddingVisible && imagesLoaded && heightStable) {
            console.log('[PageItem] COMPLETION TRIGGERED:', {
              markerY,
              y,
              viewportHeight,
              calc: y + viewportHeight - threshold,
              imagesLoaded,
              heightStable
            });
          }

          // Overscroll Prev Logic (Pull Down)
          if (onRequestPrev && !overscrollTriggered.current && isDragging.current) {
            // 5. Check overscroll threshold (top)
            if (y < -60) {
              console.log('[PageItem] Overscroll triggered prev page');
              overscrollTriggered.current = true;
              onRequestPrev();
            }
          }

          // Overscroll Logic
          // 1. Check if complete
          // CRITICAL: Only trigger if actually dragging (not momentum) to prevent double-skipping
          if (isComplete && onRequestNext && !overscrollTriggered.current && isDragging.current) {
            // 2. Check if touch started in navigation zone
            const isNavZone =
              touchStartY.current > SCREEN_HEIGHT * 0.75 ||
              (bottomPaddingVisible && touchStartY.current > SCREEN_HEIGHT * 0.5); // Relaxed zone if padding visible

            // 3. Check if touch started on image (navBlockedForGesture)
            if (isNavZone && !navBlockedForGesture.current) {
              // 4. Check overscroll threshold
              // Overscroll happens when y > contentHeight - viewportHeight
              // We want distinct pull-up, say 60px past the bottom
              const maxScrollY = Math.max(0, contentSize.height - viewportHeight);
              const overscrollAmount = y - maxScrollY;

              if (overscrollAmount > 60) {
                console.log('[PageItem] Overscroll triggered next page');
                overscrollTriggered.current = true;
                onRequestNext();
              }
            }
          }

          if (isShortContent) {
            // For short content, if we can see the marker, we are complete
            // BUT must satisfy all gates: imagesLoaded AND heightStable
            if (!isComplete && bottomPaddingVisible && imagesLoaded && heightStable) {
              console.log('[PageItem] Completion satisfied (short content)');
              setIsComplete(true);
              if (isLastPage && !completedOnceRef.current) {
                completedOnceRef.current = true;
                onPageCompleted?.();
              }
            } else if (!isComplete) {
              // Ensure swipe is disabled if not complete
              // This handles the case where it might have been enabled briefly or defaulting
              // But don't spam updates, use effect instead
            }
          } else {
            // Completion gate: strictly depends on bottomPaddingVisible && imagesLoaded && heightStable
            if (bottomPaddingVisible && imagesLoaded && heightStable && !isComplete) {
              console.log('[PageItem] Completion satisfied (long content)');
              setIsComplete(true);
              if (isLastPage && !completedOnceRef.current) {
                completedOnceRef.current = true;
                onPageCompleted?.();
              }
            }
          }
        }}
        onContentSizeChange={(w, h) => {
          // console.log('[PageItem] Content size changed:', w, h);
          if (contentHeightRef.current !== h) {
            contentHeightRef.current = h;
            lastScrollMetricsRef.current.contentHeight = h;
            markContentUnstable();
          }
        }}
        onLayout={(e) => {
          lastScrollMetricsRef.current.viewportHeight = e.nativeEvent.layout.height;
        }}
        decelerationRate="normal"
        keyboardShouldPersistTaps="handled"
        scrollIndicatorInsets={{ bottom: bottomClearance }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: 0, // Header image should start at the very top
          paddingBottom: bottomClearance,
          paddingHorizontal: 0
        }}
      >
        {isFirstPage && (
          <View style={{ marginBottom: 8 }}>
            <Image
              source={getPostCoverImage(post)}
              style={styles.coverImage}
              contentFit="cover"
              transition={300}
            />
            <View style={styles.titleContainer}>
              <Text style={styles.postTitle}>{post.title}</Text>
              <View style={styles.topicBadge}>
                <Text style={styles.topicBadgeText}>#{formatTopicName(post.topic)}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.blocksContainer}>
          {item.page.blocks.map((block, idx) => renderBlock(block, idx, item.index))}
        </View>
        <View
          onLayout={(e) => {
            console.log('[PageItem] Marker layout Y:', e.nativeEvent.layout.y);
            endMarkerLayout.current = e.nativeEvent.layout.y;
          }}
          style={{ height: 1, width: 1, backgroundColor: 'transparent' }}
        />
      </GHScrollView>

      {/* Loading Indicator (centered, visible only when isVisible but not yet revealed) */}
      {isVisible && !revealed && (
        <View style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      )}

      {/* Ready Indicator Overlay (Chevron Right - Appears only after full read) */}
      <Animated.View
        style={{
          position: 'absolute',
          right: 20,
          bottom: bottomClearance + 16,
          opacity: readyIndicatorOpacity,
        }}
        pointerEvents={isComplete ? 'auto' : 'none'}
      >
        <Pressable
          onPress={() => {
            console.log('[PageItem] Next button pressed');
            onRequestNext?.();
          }}
          disabled={!isComplete}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            alignItems: 'center',
            justifyContent: 'center',
            // Subtle shadow
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 4,
            elevation: 4,
          }}>
          <ChevronRight size={24} color={colors.primary} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
});

// ============================================================
// Single Post Reader (No internal list)
// ============================================================
function SinglePostReader({
  post,
  onClose,
  onLikeUpdate,
  onRequestNext,
  onSwipeEnableChange, // NEW
}: {
  post: Post;
  onClose: () => void;
  onLikeUpdate?: (isLiked: boolean, likeCount: number) => void;
  onRequestNext?: () => void;
  onSwipeEnableChange?: (canSwipe: boolean) => void;
}) {
  const insets = useSafeAreaInsets();
  const { token, logout } = useAuth();
  const flatListRef = useRef<GHFlatList<any>>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const currentPageRef = useRef(0); // Add ref to track latest page for viewability logic
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([0]));
  const isNavigatingRef = useRef(false);

  // Recommendation signals
  const { sendLike, sendSave, trackReadProgress, resetProgress } = useRecommendation();

  // Header is 50, Bottom bar is 60, plus safe areas
  const readerHeaderHeight = 50;
  const bottomBarHeight = 60;
  const [containerHeight, setContainerHeight] = useState(SCREEN_HEIGHT - insets.top - readerHeaderHeight - bottomBarHeight);
  const [measuredBottomBarHeight, setMeasuredBottomBarHeight] = useState(0);
  const [hasReadEnd, setHasReadEnd] = useState(false);

  // Prepare list data: Combine header into first page
  const readerData: ReaderItem[] = useMemo(() => {
    // Helper to split long paragraphs into multiple blocks
    // Approximate 10 lines by checking character count. 10 lines is roughly 450 characters.
    const splitLongParagraph = (text: string): string[] => {
      const MAX_CHARS_PER_BLOCK = 450;
      const trimmed = text.trim();
      if (trimmed.length <= MAX_CHARS_PER_BLOCK) return [trimmed];

      const parts: string[] = [];
      let current = trimmed;

      while (current.length > MAX_CHARS_PER_BLOCK) {
        // Try to split at the last sentence end before the limit
        let splitIdx = current.lastIndexOf('. ', MAX_CHARS_PER_BLOCK);
        if (splitIdx === -1) splitIdx = current.lastIndexOf(' ', MAX_CHARS_PER_BLOCK);
        if (splitIdx === -1) splitIdx = MAX_CHARS_PER_BLOCK;

        parts.push(current.slice(0, splitIdx + 1).trim());
        current = current.slice(splitIdx + 1).trim();
      }

      if (current) parts.push(current);
      return parts;
    };

    // Filter out pages and blocks that are not needed
    return post.pages
      .map((p, i) => {
        // Clean up blocks within each page
        const cleanedBlocks: ContentBlock[] = [];

        p.blocks.forEach(block => {
          // Remove horizontal rules
          if (block.type === 'paragraph' && block.text && block.text.trim().match(/^---+$/)) return;

          if (block.type === 'paragraph' && block.text) {
            const splitTexts = splitLongParagraph(block.text);
            splitTexts.forEach(txt => {
              if (txt) cleanedBlocks.push({ ...block, text: txt });
            });
          } else {
            cleanedBlocks.push(block);
          }
        });

        return {
          type: 'page' as const,
          page: { ...p, blocks: cleanedBlocks },
          index: i
        };
      })
      .filter(p => p.page.blocks.length > 0);
  }, [post.pages]);

  // Notify parent of swipe availability when read state changes
  // useEffect(() => {
  //   if (hasReadEnd) {
  //     // If we are at the top of page 0 or bottom of last page, we can swipe
  //     const isFirst = currentPage === 0;
  //     const isLast = currentPage === readerData.length - 1;
  //     // We don't have the exact scroll position here, but we can assume 
  //     // if they just reached the end, they are at the bottom of the last page.
  //     // if (isLast) {
  //     //   onSwipeEnableChange?.(true);
  //     // }
  //   }
  // }, [hasReadEnd, currentPage, readerData.length, onSwipeEnableChange]);

  // Reset page indicator when post changes
  useEffect(() => {
    setCurrentPage(0);
    currentPageRef.current = 0;
    setVisiblePages(new Set([0]));
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    setShowComments(false); // Reset comments view on post change
    setIsLiked(!!post.isLiked);
    setLikeCount(post.likeCount || 0);
    resetProgress(post.uid); // Reset read progress tracking
  }, [post.uid, post.isLiked, post.likeCount, resetProgress]);

  const pageTextScale = useRef(new Animated.Value(1)).current;
  const dotScales = useRef(post.pages.map(() => new Animated.Value(1))).current;

  // Like functionality
  const [isLiked, setIsLiked] = useState(!!post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [isLiking, setIsLiking] = useState(false);
  const likeScale = useRef(new Animated.Value(1)).current;

  // Save functionality - using Context
  const { isPostSaved, toggleSavePost } = useSaved();
  const isBookmarked = isPostSaved(post.uid);
  const [isSaving, setIsSaving] = useState(false);

  // Save animation
  const saveScale = useRef(new Animated.Value(1)).current;

  // Update dots and text animation when page changes
  useEffect(() => {
    // Animate the active dot and reset others
    dotScales.forEach((scale, idx) => {
      Animated.spring(scale, {
        toValue: currentPage === idx ? 1.3 : 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true,
      }).start();
    });

    // Animate page indicator text
    pageTextScale.setValue(1);
    Animated.sequence([
      Animated.timing(pageTextScale, {
        toValue: 1.4,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(pageTextScale, {
        toValue: 1,
        friction: 3,
        tension: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentPage]);

  // Track read progress for recommendation signals
  useEffect(() => {
    // currentPage is 0-based, trackReadProgress expects 1-based
    trackReadProgress(post.uid, currentPage + 1, post.pages.length);
  }, [currentPage, post.uid, post.pages.length, trackReadProgress]);

  // Viewability Config - reduced threshold to make it more responsive when scrolling back
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 40,
    minimumViewTime: 0,
  }).current;

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      // Find the page that is most visible (top-most in case of ties)
      const visibleIndices = viewableItems.map((item: any) => item.index);
      const newPage = Math.min(...visibleIndices);

      // Update revealed pages
      setVisiblePages(prev => {
        const next = new Set(prev);
        visibleIndices.forEach((idx: number) => next.add(idx));
        return next;
      });

      // Skip updating current page if we are in the middle of a programmatic navigation
      if (isNavigatingRef.current) return;

      if (newPage !== currentPageRef.current && newPage >= 0 && newPage < post.pages.length) {
        currentPageRef.current = newPage;
        setCurrentPage(newPage);
      }
    }
  }).current;

  const handleLike = async () => {
    if (isLiking) return;

    if (!token) {
      Alert.alert(
        'Login Required',
        'Please log in to like posts.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Login', onPress: () => {
              onClose();
              // We need a way to switch to 'me' tab. 
              // In this monolithic App.tsx, we can't easily do it from here without passing props.
              // But for now, just informing the user is better than a silent fail or rollback.
            }
          }
        ]
      );
      return;
    }

    setIsLiking(true);

    // Optimistic Update
    const prevIsLiked = isLiked;
    const prevLikeCount = likeCount;

    setIsLiked(!prevIsLiked);
    setLikeCount(prev => prevIsLiked ? prev - 1 : prev + 1);

    // Animation
    Animated.sequence([
      Animated.spring(likeScale, {
        toValue: 1.3,
        useNativeDriver: true,
        friction: 3,
      }),
      Animated.spring(likeScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
      }),
    ]).start();

    try {
      if (prevIsLiked) {
        await unlikeItem(post.uid, 'post');
      } else {
        await likeItem(post.uid, 'post');
        // Send LIKE signal for recommendation (only on like, not unlike)
        sendLike(post.uid);
      }
      // Update hook state so it persists during swipes
      onLikeUpdate?.(!prevIsLiked, prevIsLiked ? prevLikeCount - 1 : prevLikeCount + 1);
    } catch (error: any) {
      // Rollback
      setIsLiked(prevIsLiked);
      setLikeCount(prevLikeCount);
      console.error('Like failed', error);

      if (error?.status === 401) {
        Alert.alert('Session Expired', 'Your session has expired. Please log in again.');
        logout();
      } else {
        Alert.alert('Error', error?.message || 'Failed to update like status');
      }
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this post on Sparks: ${post.title}\n\nSent from Sparks App`,
        title: post.title,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleBookmark = async () => {
    if (isSaving) return;
    const wasBookmarked = isBookmarked;
    setIsSaving(true);
    Animated.sequence([
      Animated.spring(saveScale, { toValue: 1.3, useNativeDriver: true, friction: 3 }),
      Animated.spring(saveScale, { toValue: 1, useNativeDriver: true, friction: 3 }),
    ]).start();
    try {
      await toggleSavePost(post);
      // Send SAVE signal for recommendation (only on save, not unsave)
      if (!wasBookmarked) {
        sendSave(post.uid);
      }
    } catch (err) {
      console.error('Failed to toggle save:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const [showComments, setShowComments] = useState(false);
  const commentSheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(commentSheetTranslateY, {
      toValue: showComments ? 0 : SCREEN_HEIGHT,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [showComments]);

  const scrollToPrevPage = () => {
    if (isNavigatingRef.current) return;

    const prevIndex = currentPage - 1;
    if (prevIndex >= 0) {
      isNavigatingRef.current = true;
      flatListRef.current?.scrollToIndex({
        index: prevIndex,
        animated: true,
      });
      setCurrentPage(prevIndex);
      currentPageRef.current = prevIndex;

      // Unlock after animation
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    }
  };

  const scrollToNextPage = () => {
    if (isNavigatingRef.current) return;

    const nextIndex = currentPage + 1;
    if (nextIndex < post.pages.length) {
      isNavigatingRef.current = true;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setCurrentPage(nextIndex);
      currentPageRef.current = nextIndex;

      // Unlock after animation
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    } else {
      // Last page reached
      console.log('Last page finished');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.readerContainer, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 顶部栏 */}
      <View style={styles.readerHeader}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <ChevronLeft size={28} color={colors.text} />
        </Pressable>

        {/* 页码指示器 */}
        <View style={styles.pageDotsHeader}>
          {post.pages.map((_, idx) => (
            <Animated.View
              key={idx}
              style={[
                styles.dotSmall,
                currentPage === idx && styles.dotSmallActive,
                { transform: [{ scale: dotScales[idx] || 1 }] }
              ]}
            />
          ))}
        </View>

        <Animated.Text style={[
          styles.pageIndicator,
          { transform: [{ scale: pageTextScale }] }
        ]}>
          {currentPage + 1}/{post.pages.length}
        </Animated.Text>
      </View>

      {/* 垂直滚动内容 (使用 FlatList + snapToInterval) */}
      <GHFlatList
        ref={flatListRef}
        data={readerData}
        scrollEnabled={false} // Lock manual scrolling between pages
        keyExtractor={(_, index) => `reader-item-${index}`}
        renderItem={({ item, index }) => (
          <View style={{ height: Math.floor(containerHeight) }}>
            <PageItem
              item={item}
              post={post}
              isVisible={visiblePages.has(index)}
              containerHeight={Math.floor(containerHeight)}
              isLastPage={index === readerData.length - 1}
              bottomBarHeight={measuredBottomBarHeight}
              hasReadEnd={hasReadEnd}
              onRequestNext={scrollToNextPage} // Always provide next page function
              onRequestPrev={scrollToPrevPage}
              onPageCompleted={index === readerData.length - 1 ? () => setHasReadEnd(true) : undefined}
              onSwipeEnableChange={undefined} // No longer needed
            />
          </View>
        )}
        style={styles.readerScroll}
        showsVerticalScrollIndicator={false}
        pagingEnabled={false}
        snapToInterval={Math.floor(containerHeight)}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        scrollEventThrottle={16}
        getItemLayout={(data, index) => ({
          length: Math.floor(containerHeight),
          offset: Math.floor(containerHeight) * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onLayout={(e) => {
          const { height } = e.nativeEvent.layout;
          if (height > 0) setContainerHeight(height);
        }}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={false}
      />

      {/* 底部操作栏 */}
      <View
        style={[styles.postBottomBar, { paddingBottom: insets.bottom }]}
        onLayout={(e) => {
          const { height } = e.nativeEvent.layout;
          if (height > 0) setMeasuredBottomBarHeight(height);
        }}
      >
        {/* 评论输入区域 - 占2/3宽度 */}
        <Pressable
          style={styles.noteInputContainer}
          onPress={() => setShowComments(true)}
        >
          <View style={styles.notePlaceholder}>
            <Pencil size={16} color={colors.textMuted} />
            <Text style={styles.notePlaceholderText}>Write a comment...</Text>
          </View>
        </Pressable>

        {/* 操作按钮区域 - 占1/3宽度 */}
        <View style={styles.actionButtons}>
          {/* 点赞按钮 */}
          <Pressable
            style={styles.actionButton}
            onPress={handleLike}
            disabled={isLiking}
          >
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Heart
                size={22}
                color={isLiked ? colors.accent : colors.textSecondary}
                fill={isLiked ? colors.accent : 'transparent'}
              />
            </Animated.View>
            <Text style={[
              styles.actionButtonText,
              isLiked && { color: colors.accent, fontWeight: '600' }
            ]}>
              {likeCount > 0 ? likeCount : 'Like'}
            </Text>
          </Pressable>

          {/* 收藏按钮 - 带动画 */}
          <Pressable
            style={styles.actionButton}
            onPress={handleBookmark}
            disabled={isSaving}
          >
            <Animated.View style={{ transform: [{ scale: saveScale }] }}>
              {isBookmarked ? (
                <BookmarkCheck
                  size={22}
                  color={colors.primary}
                  fill={colors.primary}
                />
              ) : (
                <Bookmark
                  size={22}
                  color={colors.textSecondary}
                />
              )}
            </Animated.View>
            <Text style={[
              styles.actionButtonText,
              isBookmarked && { color: colors.primary, fontWeight: '600' }
            ]}>
              {isBookmarked ? 'Saved' : 'Save'}
            </Text>
          </Pressable>

          {/* 分享按钮 */}
          <Pressable style={styles.actionButton} onPress={handleShare}>
            <Share2 size={22} color={colors.textSecondary} />
            <Text style={styles.actionButtonText}>Share</Text>
          </Pressable>
        </View>
      </View>

      {/* Floating Comment Sheet */}
      <Animated.View style={[
        styles.commentSheet,
        {
          transform: [{ translateY: commentSheetTranslateY }],
          paddingBottom: insets.bottom + 20
        }
      ]}>
        <View style={styles.commentSheetHeader}>
          <View style={styles.commentSheetKnob} />
          <Pressable style={styles.commentSheetClose} onPress={() => setShowComments(false)}>
            <X size={20} color={colors.textMuted} />
          </Pressable>
        </View>
        <ScrollView style={{ flex: 1 }}>
          <CommentSection postId={post.uid} />
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// Post Loader (Fetches individual post)
// ============================================================
function PostLoader({
  uid,
  onClose,
  onFeedLikeUpdate,
  onMissing,
  onRequestNext,
  onRequestPrev,
  onSwipeEnableChange, // NEW
}: {
  uid: string,
  onClose: () => void,
  onFeedLikeUpdate?: (uid: string, isLiked: boolean, likeCount: number) => void;
  onMissing?: (uid: string) => void;
  onRequestNext?: () => void;
  onRequestPrev?: () => void;
  onSwipeEnableChange?: (canSwipe: boolean) => void;
}) {
  const { post, status, error, refetch, updateLocalLike } = usePost(uid);
  const { sendClick } = useRecommendation();

  // Handle missing post
  useEffect(() => {
    if (status === 'error' && error === 'POST_NOT_FOUND') {
      console.log('[PostLoader] Post missing, notifying parent:', uid);
      onMissing?.(uid);
    }
  }, [status, error, uid, onMissing]);

  // 发送 CLICK 信号（帖子加载成功时）
  useEffect(() => {
    console.log('[PostLoader] useEffect triggered:', { postUid: post?.uid, status });
    if (post && status === 'success') {
      console.log('[PostLoader] Calling sendClick for:', post.uid);
      sendClick(post.uid);
    }
  }, [post?.uid, status, sendClick]);

  if (status === 'loading') {
    return (
      <View style={[styles.readerContainer, { justifyContent: 'center', alignItems: 'center', width: SCREEN_WIDTH }]}>
        <LoadingScreen />
        <Pressable style={styles.modalCloseButton} onPress={onClose}>
          <X size={24} color={colors.text} />
        </Pressable>
      </View>
    );
  }

  if (status === 'error' || !post) {
    // If it's a 404, we don't show the error screen because parent will skip it
    if (error === 'POST_NOT_FOUND') {
      return (
        <View style={[styles.readerContainer, { justifyContent: 'center', alignItems: 'center', width: SCREEN_WIDTH }]}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    return (
      <View style={[styles.readerContainer, { justifyContent: 'center', alignItems: 'center', width: SCREEN_WIDTH }]}>
        <ErrorScreen
          message={error || 'Failed to load post'}
          onRetry={refetch}
        />
        <Pressable style={styles.modalCloseButton} onPress={onClose}>
          <X size={24} color={colors.text} />
        </Pressable>
      </View>
    );
  }

  return (
    <SinglePostReader
      post={post}
      onClose={onClose}
      onLikeUpdate={(isLiked, count) => {
        updateLocalLike(isLiked, count);
        onFeedLikeUpdate?.(uid, isLiked, count);
      }}
      onRequestNext={onRequestNext}
      onSwipeEnableChange={onSwipeEnableChange}
    />
  );
}

// ============================================================
// Post Swiper (Horizontal Feed)
// ============================================================
// Standard Horizontal FlatList to allow swiping between posts.

function PostSwiper({
  items,
  initialIndex,
  onClose,
  onFeedLikeUpdate,
  onLoadMore,
  onMissing
}: {
  items: FeedItem[];
  initialIndex: number;
  onClose: () => void;
  onFeedLikeUpdate?: (uid: string, isLiked: boolean, likeCount: number) => void;
  onLoadMore?: () => void;
  onMissing?: (uid: string) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current; // Track scroll position

  // Sync index externally (if needed, though usually initialIndex is enough)
  useEffect(() => {
    if (initialIndex !== currentIndex && initialIndex >= 0 && initialIndex < items.length) {
      // Only update if significantly different to avoid loops, 
      // but here we just trust the prop if it changes.
      // Note: Scrolling manually is better to avoid jitter.
      // setCurrentIndex(initialIndex);
      // flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
    }
  }, [initialIndex]);

  // Load more trigger
  useEffect(() => {
    const remaining = items.length - currentIndex - 1;
    if (remaining <= 2 && onLoadMore) {
      onLoadMore();
    }
  }, [currentIndex, items.length, onLoadMore]);

  const getItemLayout = (_: any, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const renderItem = useCallback(({ item, index }: { item: FeedItem, index: number }) => {
    // Optimization: Only render current, prev, and next to save memory/cpu
    if (Math.abs(currentIndex - index) > 1) {
      return <View style={{ width: SCREEN_WIDTH, flex: 1, backgroundColor: 'black' }} />;
    }

    // Parallax / Card Stack Effect
    // "Higher index is on top" (React Native default z-order)
    // When scrolling Next (i -> i+1): i+1 slides OVER i. i moves slowly (parallax).
    // When scrolling Prev (i -> i-1): i slides OFF i-1. i-1 moves slowly (parallax).

    const inputRange = [
      (index - 1) * SCREEN_WIDTH,
      index * SCREEN_WIDTH,
      (index + 1) * SCREEN_WIDTH
    ];

    const translateX = scrollX.interpolate({
      inputRange,
      // Left (i-1): 0 (Standard slide in from right)
      // Center (i): 0
      // Right (i+1): +0.7W (Counteract left movement, effectively moving at 0.3W speed)
      outputRange: [0, 0, SCREEN_WIDTH * 0.7],
    });

    const opacity = scrollX.interpolate({
      inputRange,
      // Dim the item when it goes to the background (scrolled past)
      outputRange: [1, 1, 0.6],
      extrapolate: 'clamp'
    });

    // We also need to scale it slightly when it's in background to enhance depth
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [1, 1, 0.95],
      extrapolate: 'clamp'
    });

    return (
      <View style={{ width: SCREEN_WIDTH, flex: 1, overflow: 'hidden' }}>
        <Animated.View style={{
          flex: 1,
          transform: [{ translateX }, { scale }],
          opacity
        }}>
          <PostLoader
            uid={item.uid}
            onClose={onClose}
            onFeedLikeUpdate={onFeedLikeUpdate}
            onMissing={onMissing}
          />
        </Animated.View>
      </View>
    );
  }, [currentIndex, onClose, onFeedLikeUpdate, onMissing, scrollX]);

  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <Animated.FlatList
        ref={flatListRef}
        data={items}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        keyExtractor={(item) => item.uid}
        initialScrollIndex={initialIndex}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        showsHorizontalScrollIndicator={false}
        windowSize={3}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        removeClippedSubviews={true}
        decelerationRate="fast"
        disableIntervalMomentum
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      />
    </View>
  );
}

// ============================================================
// 占位页面
// ============================================================
// ============================================================
// 历史页面 - History Screen
// ============================================================
function HistoryScreen({
  onItemPress,
  onBack
}: {
  onItemPress: (uid: string) => void;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [historyData, setHistoryData] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);

  const isLoadingRef = useRef(false);

  const loadHistory = useCallback(async (isRefresh = false) => {
    if (!user || isLoadingRef.current) return;
    if (!isRefresh && (!hasMore || (!nextCursor && historyData.length > 0))) return;

    isLoadingRef.current = true;
    setLoading(true);
    setError(false);
    try {
      const response = await getMyHistory(20, isRefresh ? undefined : nextCursor);

      const newItems = response.items || [];
      setHistoryData(prev => {
        const combined = isRefresh ? newItems : [...prev, ...newItems];
        const seen = new Set();
        return combined.filter(item => {
          if (seen.has(item.itemId)) return false;
          seen.add(item.itemId);
          return true;
        });
      });
      setNextCursor(response.nextCursor);
      setHasMore(!!response.nextCursor && newItems.length > 0);
    } catch (e) {
      console.log('Failed to load history', e);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isLoadingRef.current = false;
    }
  }, [user, nextCursor, hasMore, historyData.length]);

  useEffect(() => {
    loadHistory(true);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    loadHistory(true);
  };

  const handleClearHistory = () => {
    Alert.alert('Clear History', 'Are you sure you want to clear your entire history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const prevData = [...historyData];
          setHistoryData([]);
          try {
            await clearHistory();
          } catch (error) {
            setHistoryData(prevData);
            Alert.alert('Error', 'Failed to clear history');
          }
        }
      }
    ]);
  };

  const formatDate = (dateString?: string) => {
    return formatRelativeTime(dateString);
  };

  const renderHistoryItem = ({ item }: { item: unknown }) => {
    const historyItem = item as ProfileItem;
    return (
      <View style={styles.historyCard}>
        <Pressable
          style={styles.historyCardInner}
          onPress={() => historyItem.itemType === 'post' && onItemPress(historyItem.itemId)}
        >
          <View style={styles.historyImageContainer}>
            {historyItem.thumbnail ? (
              <Image source={{ uri: historyItem.thumbnail }} style={styles.historyImage} contentFit="cover" />
            ) : (
              <View style={[styles.historyImage, styles.historyPlaceholder]}>
                <Text style={styles.historyPlaceholderText}>
                  {historyItem.itemType?.substring(0, 1).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.historyInfo}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyBadge}>{historyItem.itemType}</Text>
              <Text style={styles.historyDate}>{formatDate(historyItem.createdAt)}</Text>
            </View>
            <Text style={styles.historyTitle} numberOfLines={2}>
              {historyItem.title || `${historyItem.itemType} #${historyItem.itemId}`}
            </Text>
          </View>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.modalHeader}>
        <Pressable
          style={styles.modalCloseButtonInline}
          onPress={onBack}
        >
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.modalHeaderTitle}>History</Text>
        <View style={styles.headerRightArea}>
          {historyData.length > 0 && (
            <Pressable onPress={handleClearHistory} style={styles.headerClearButton}>
              <Trash2 size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={historyData}
        renderItem={renderHistoryItem}
        keyExtractor={(item) => `history-${item.itemId}`}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        onEndReached={() => loadHistory()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator style={{ margin: 24 }} color={colors.primary} />
          ) : error ? (
            <Pressable onPress={() => loadHistory()} style={styles.retryFooter}>
              <Text style={styles.retryFooterText}>Load failed. Tap to retry</Text>
            </Pressable>
          ) : historyData.length > 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>— End of History —</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Clock size={48} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={styles.emptyStateText}>No history records yet</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

// ============================================================
// 点赞页面 - Likes Screen
// ============================================================
function LikesScreen({
  onItemPress,
  onToggleLike,
  onBack
}: {
  onItemPress: (uid: string) => void;
  onToggleLike?: () => void;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [likesData, setLikesData] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);

  const isLoadingRef = useRef(false);

  const loadLikes = useCallback(async (isRefresh = false) => {
    if (!user || isLoadingRef.current) return;
    if (!isRefresh && (!hasMore || (!nextCursor && likesData.length > 0))) return;

    isLoadingRef.current = true;
    setLoading(true);
    setError(false);
    try {
      const response = await getMyLikes(20, isRefresh ? undefined : nextCursor);

      const newItems = response.items || [];
      setLikesData(prev => {
        const combined = isRefresh ? newItems : [...prev, ...newItems];
        const seen = new Set();
        return combined.filter(item => {
          if (seen.has(item.itemId)) return false;
          seen.add(item.itemId);
          return true;
        });
      });
      setNextCursor(response.nextCursor);
      setHasMore(!!response.nextCursor && newItems.length > 0);
    } catch (e) {
      console.log('Failed to load likes', e);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isLoadingRef.current = false;
    }
  }, [user, nextCursor, hasMore, likesData.length]);

  useEffect(() => {
    loadLikes(true);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    loadLikes(true);
  };

  const handleUnlike = async (itemId: string, itemType: string) => {
    const prevData = [...likesData];
    setLikesData(prev => prev.filter(item => item.itemId !== itemId));
    try {
      await unlikeItem(itemId, itemType);
      onToggleLike?.();
    } catch (error) {
      setLikesData(prevData);
      Alert.alert('Error', 'Failed to unlike item');
    }
  };

  const formatDate = (dateString?: string) => {
    return formatRelativeTime(dateString);
  };

  const renderLikeItem = ({ item }: { item: unknown }) => {
    const likeItem = item as ProfileItem;
    return (
      <View style={styles.historyCard}>
        <Pressable
          style={styles.historyCardInner}
          onPress={() => likeItem.itemType === 'post' && onItemPress(likeItem.itemId)}
        >
          <View style={styles.historyImageContainer}>
            {likeItem.thumbnail ? (
              <Image source={{ uri: likeItem.thumbnail }} style={styles.historyImage} contentFit="cover" />
            ) : (
              <View style={[styles.historyImage, styles.historyPlaceholder]}>
                <Text style={styles.historyPlaceholderText}>
                  {likeItem.itemType?.substring(0, 1).toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.historyInfo}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyBadge}>{likeItem.itemType}</Text>
              <Text style={styles.historyDate}>{formatDate(likeItem.createdAt)}</Text>
            </View>
            <Text style={styles.historyTitle} numberOfLines={2}>
              {likeItem.title || `${likeItem.itemType} #${likeItem.itemId}`}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => handleUnlike(likeItem.itemId, likeItem.itemType)}
          style={({ pressed }) => [
            styles.unlikeButton,
            pressed && { transform: [{ scale: 0.92 }], opacity: 0.8 }
          ]}
        >
          <Heart size={22} color={colors.accent} fill={colors.accent} />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.modalHeader}>
        <Pressable
          style={styles.modalCloseButtonInline}
          onPress={onBack}
        >
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.modalHeaderTitle}>Likes</Text>
        <View style={styles.headerRightArea} />
      </View>

      <FlatList
        data={likesData}
        renderItem={renderLikeItem}
        keyExtractor={(item) => `like-${item.itemId}`}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        onEndReached={() => loadLikes()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading ? (
            <ActivityIndicator style={{ margin: 24 }} color={colors.primary} />
          ) : error ? (
            <Pressable onPress={() => loadLikes()} style={styles.retryFooter}>
              <Text style={styles.retryFooterText}>Load failed. Tap to retry</Text>
            </Pressable>
          ) : likesData.length > 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>— End of Likes —</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Heart size={48} color={colors.textMuted} strokeWidth={1.5} />
              <Text style={styles.emptyStateText}>No liked posts yet</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>{title}</Text>
      <Text style={styles.placeholderSubtext}>Coming soon...</Text>
    </View>
  );
}

// ============================================================
// Debug Panel - 推荐算法可视化
// ============================================================
function DebugPanel({
  visible,
  onClose,
  onResetComplete
}: {
  visible: boolean;
  onClose: () => void;
  onResetComplete?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { state, resetRecommendation, isResetting } = useRecommendation();

  // 包装 reset 函数，完成后调用 onResetComplete
  const handleReset = useCallback(async () => {
    await resetRecommendation();
    onResetComplete?.();
  }, [resetRecommendation, onResetComplete]);
  const { bucketCount, clickCount, lastSignal } = state;
  const [isExpanded, setIsExpanded] = useState(true);

  // Debug: 监控状态变化
  useEffect(() => {
    console.log('[DebugPanel] State updated:', {
      bucketCount: Object.keys(bucketCount).length,
      clickCount,
      lastSignal: lastSignal?.signalType
    });
  }, [bucketCount, clickCount, lastSignal]);

  // 计算总权重和每个 bucket 的百分比
  const bucketEntries = Object.entries(bucketCount);
  const totalWeight = bucketEntries.reduce((sum, [, weight]) => sum + weight, 0);
  const maxWeight = Math.max(...bucketEntries.map(([, w]) => w), 1);

  // 距离下次 rebalance 的次数
  const clicksToRebalance = 30 - (clickCount % 30);

  // 格式化 bucket 名称
  const formatBucketName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // 获取 bucket 颜色
  const getBucketColor = (index: number) => {
    const hue = (index * 137.5) % 360; // Golden angle for good distribution
    return `hsl(${hue}, 70%, 50%)`;
  };

  if (!visible) return null;

  return (
    <Animated.View style={[
      styles.debugPanel,
      { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }
    ]}>
      {/* Header */}
      <View style={styles.debugHeader}>
        <View style={styles.debugHeaderLeft}>
          <Bug size={20} color={colors.primary} />
          <Text style={styles.debugTitle}>Recommendation Debug</Text>
        </View>
        <View style={styles.debugHeaderRight}>
          <Pressable
            style={styles.debugExpandButton}
            onPress={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown size={20} color={colors.textSecondary} />
            ) : (
              <ChevronUp size={20} color={colors.textSecondary} />
            )}
          </Pressable>
          <Pressable style={styles.debugCloseButton} onPress={onClose}>
            <X size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {isExpanded && (
        <ScrollView style={styles.debugContent} showsVerticalScrollIndicator={false}>
          {/* Click Counter */}
          <View style={styles.debugSection}>
            <Text style={styles.debugSectionTitle}>Click Progress</Text>
            <View style={styles.debugClickCounter}>
              <View style={styles.debugClickBar}>
                <View
                  style={[
                    styles.debugClickProgress,
                    { width: `${((clickCount % 30) / 30) * 100}%` }
                  ]}
                />
              </View>
              <Text style={styles.debugClickText}>
                {clickCount} clicks • {clicksToRebalance} to rebalance
              </Text>
            </View>
          </View>

          {/* Last Signal */}
          {lastSignal && (
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Last Signal</Text>
              <View style={styles.debugLastSignal}>
                <Text style={styles.debugSignalType}>{lastSignal.signalType}</Text>
                <Text style={styles.debugSignalPost}>
                  Post: {lastSignal.postId.slice(0, 12)}...
                </Text>
              </View>
            </View>
          )}

          {/* Bucket Weights */}
          <View style={styles.debugSection}>
            <Text style={styles.debugSectionTitle}>
              Bucket Weights ({bucketEntries.length})
            </Text>
            {bucketEntries.length > 0 ? (
              <View style={styles.debugBucketList}>
                {bucketEntries
                  .sort(([, a], [, b]) => b - a)
                  .map(([bucket, weight], index) => {
                    const percentage = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
                    const barWidth = (weight / maxWeight) * 100;
                    return (
                      <View key={bucket} style={styles.debugBucketItem}>
                        <View style={styles.debugBucketHeader}>
                          <Text style={styles.debugBucketName} numberOfLines={1}>
                            {formatBucketName(bucket)}
                          </Text>
                          <Text style={styles.debugBucketWeight}>
                            {weight.toFixed(2)} ({percentage.toFixed(1)}%)
                          </Text>
                        </View>
                        <View style={styles.debugBucketBarBg}>
                          <View
                            style={[
                              styles.debugBucketBar,
                              {
                                width: `${barWidth}%`,
                                backgroundColor: getBucketColor(index),
                              }
                            ]}
                          />
                        </View>
                      </View>
                    );
                  })}
              </View>
            ) : (
              <Text style={styles.debugEmptyText}>
                No bucket data yet. Interact with posts to see weights.
              </Text>
            )}
          </View>

          {/* Reset Button */}
          <View style={styles.debugSection}>
            <Pressable
              style={[
                styles.debugResetButton,
                isResetting && styles.debugResetButtonDisabled
              ]}
              onPress={handleReset}
              disabled={isResetting}
            >
              <RefreshCw
                size={18}
                color="#fff"
                style={isResetting ? { opacity: 0.5 } : undefined}
              />
              <Text style={styles.debugResetText}>
                {isResetting ? 'Resetting...' : 'Reset Recommendation State'}
              </Text>
            </Pressable>
            <Text style={styles.debugResetHint}>
              Clears history and resets all bucket weights to default
            </Text>
          </View>
        </ScrollView>
      )}
    </Animated.View>
  );
}

// ============================================================
// 保存页面 - Saved Screen
// ============================================================
function SavedScreen({
  onItemPress
}: {
  onItemPress: (uid: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { savedPosts, isEmpty, isLoading, unsave, clearAll, savedCount } = useSavedPosts();

  // 删除动画
  const handleUnsave = useCallback((uid: string, title: string) => {
    Alert.alert(
      'Remove from Saved',
      `Remove "${title.slice(0, 20)}${title.length > 20 ? '...' : ''}" from saved?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => unsave(uid),
        },
      ]
    );
  }, [unsave]);

  // 清空所有
  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear All Saved',
      'Remove all saved posts? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove All',
          style: 'destructive',
          onPress: () => clearAll(),
        },
      ]
    );
  }, [clearAll]);

  // 格式化保存时间
  const formatSavedTime = (isoString: string) => {
    return formatRelativeTime(isoString);
  };

  // 渲染空状态（未登录显示提示登录；已登录无收藏显示「无保存」）
  const renderEmptyState = () => (
    <View style={styles.savedEmptyContainer}>
      <View style={styles.savedEmptyIcon}>
        <BookmarkPlus size={48} color={colors.primaryLight} strokeWidth={1.5} />
      </View>
      <Text style={styles.savedEmptyTitle}>
        {token ? 'No Saved Posts' : 'Please log in to use the feature'}
      </Text>
      {token ? (
        <>
          <Text style={styles.savedEmptySubtitle}>
            Tap Save while reading posts{'\n'}to revisit them anytime
          </Text>
          <View style={styles.savedEmptyHint}>
            <Bookmark size={16} color={colors.textMuted} />
            <Text style={styles.savedEmptyHintText}>Tap Save to start collecting</Text>
          </View>
        </>
      ) : null}
    </View>
  );

  // 渲染保存项
  const renderSavedItem = ({ item, index }: { item: unknown; index: number }) => {
    const savedItem = item as typeof savedPosts[0];
    const localCover = getPostCover(savedItem.uid);

    return (
      <Animated.View
        style={[
          styles.savedCard,
          { opacity: 1 }
        ]}
      >
        <Pressable
          style={styles.savedCardInner}
          onPress={() => onItemPress(savedItem.uid)}
        >
          {/* 封面图 */}
          <Image
            source={localCover || (savedItem.coverImageUri ? { uri: savedItem.coverImageUri } : { uri: `https://via.placeholder.com/120x150/4f46e5/ffffff?text=${encodeURIComponent(savedItem.title.slice(0, 5))}` })}
            style={styles.savedCardImage}
            contentFit="cover"
            transition={300}
          />

          {/* 内容 */}
          <View style={styles.savedCardContent}>
            <View style={styles.savedCardHeader}>
              <View style={styles.savedTopicBadge}>
                <Text style={styles.savedTopicText}>#{formatTopicName(savedItem.topic)}</Text>
              </View>
            </View>

            <Text style={styles.savedCardTitle} numberOfLines={2}>
              {savedItem.title}
            </Text>

            <View style={styles.savedCardFooter}>
              <View style={styles.savedTimeRow}>
                <Clock size={12} color={colors.textMuted} />
                <Text style={styles.savedTimeText}>
                  {formatSavedTime(savedItem.savedAt)}
                </Text>
              </View>
            </View>
          </View>

          {/* 删除按钮 */}
          <Pressable
            style={styles.savedDeleteButton}
            onPress={() => handleUnsave(savedItem.uid, savedItem.title)}
            hitSlop={8}
          >
            <Trash2 size={18} color={colors.textMuted} />
          </Pressable>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.savedContainer}>
      {/* 顶部标题栏 */}
      <View style={styles.savedHeader}>
        <View style={styles.savedHeaderLeft}>
          <Bookmark size={24} color={colors.primary} fill={colors.primary} />
          <Text style={styles.savedHeaderTitle}>My Saved</Text>
          {savedCount > 0 && (
            <View style={styles.savedCountBadge}>
              <Text style={styles.savedCountText}>{savedCount}</Text>
            </View>
          )}
        </View>

        {savedCount > 0 && (
          <Pressable
            style={styles.savedClearButton}
            onPress={handleClearAll}
          >
            <Trash2 size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* 内容列表 */}
      {isLoading ? (
        <View style={styles.savedLoadingContainer}>
          <Sparkles size={32} color={colors.primary} />
          <Text style={styles.savedLoadingText}>Loading...</Text>
        </View>
      ) : isEmpty ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={savedPosts}
          renderItem={renderSavedItem}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={[
            styles.savedListContent,
            { paddingBottom: insets.bottom + 80 }
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.savedItemSeparator} />}
        />
      )}
    </View>
  );
}

// ============================================================
// Loading Screen
// ============================================================
function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Sparkles size={48} color={colors.primary} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

// ============================================================
// Error 状态组件
// ============================================================
function ErrorScreen({
  message,
  onRetry
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={styles.errorTitle}>Failed to Load</Text>
      <Text style={styles.errorMessage}>{message}</Text>
      <Pressable style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </Pressable>
    </View>
  );
}

// ============================================================
// 搜索页面 - Search Screen
// ============================================================
function SearchScreen({
  items,
  onItemPress,
  onClose
}: {
  items: FeedItem[];
  onItemPress: (uid: string) => void;
  onClose: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const insets = useSafeAreaInsets();

  // 加载搜索历史
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const saved = await AsyncStorage.getItem('search_history');
        if (saved) setHistory(JSON.parse(saved));
      } catch (e) { }
    };
    loadHistory();
  }, []);

  // 过滤结果
  const filteredItems = searchQuery.trim() === ''
    ? []
    : items.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.topic.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleSearch = async (text: string) => {
    const trimmed = text.trim();
    if (trimmed && !history.includes(trimmed)) {
      const newHistory = [trimmed, ...history].slice(0, 10);
      setHistory(newHistory);
      try {
        await AsyncStorage.setItem('search_history', JSON.stringify(newHistory));
      } catch (e) { }
    }
  };

  const clearHistory = async () => {
    setHistory([]);
    try {
      await AsyncStorage.removeItem('search_history');
    } catch (e) { }
  };

  return (
    <View style={[styles.searchContainer, { paddingTop: insets.top }]}>
      {/* 搜索栏 */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchFieldContainer}>
          <Search size={18} color={colors.textMuted} style={styles.searchIconSmall} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search posts or topics..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => handleSearch(searchQuery)}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchButton}>
              <X size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
        <Pressable onPress={onClose} style={styles.cancelSearchButton}>
          <Text style={styles.cancelSearchText}>Cancel</Text>
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {searchQuery.trim() === '' ? (
          // 搜索历史
          <View style={styles.searchHistoryContainer}>
            <View style={styles.searchHistoryHeader}>
              <Text style={styles.searchHistoryTitle}>Recent Searches</Text>
              {history.length > 0 && (
                <Pressable onPress={clearHistory}>
                  <Trash2 size={16} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
            <View style={styles.searchHistoryTags}>
              {history.length > 0 ? (
                history.map((item, index) => (
                  <Pressable
                    key={index}
                    style={styles.historyTag}
                    onPress={() => {
                      setSearchQuery(item);
                      handleSearch(item);
                    }}
                  >
                    <Clock size={12} color={colors.textMuted} style={{ marginRight: 6 }} />
                    <Text style={styles.historyTagText}>{item}</Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.noHistoryText}>No recent searches</Text>
              )}
            </View>
          </View>
        ) : (
          // 搜索结果
          <View style={{ paddingHorizontal: 8, paddingTop: 12 }}>
            {filteredItems.length > 0 ? (
              <MasonryFeed
                items={filteredItems}
                onItemPress={(uid) => {
                  handleSearch(searchQuery);
                  onItemPress(uid);
                }}
              />
            ) : (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No results found for "{searchQuery}"</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================================
// Collection Screen - Grouped by Topic
// ============================================================
function CollectionScreen({
  items,
  onItemPress,
  onTopicPress
}: {
  items: FeedItem[];
  onItemPress: (uid: string) => void;
  onTopicPress: (topic: string) => void;
}) {
  const insets = useSafeAreaInsets();

  // Group items by topic
  const groupedItems = useMemo(() => {
    const groups: { [key: string]: FeedItem[] } = {};
    items.forEach(item => {
      if (!groups[item.topic]) {
        groups[item.topic] = [];
      }
      groups[item.topic].push(item);
    });
    return Object.entries(groups).map(([topic, items]) => ({ topic, items }));
  }, [items]);

  return (
    <View style={styles.collectionContainer}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {groupedItems.map(({ topic, items }) => (
          <View key={topic} style={styles.collectionSection}>
            {/* Section Header */}
            <View style={styles.collectionHeader}>
              <View style={styles.collectionHeaderLeft}>
                <Text style={styles.collectionTitle}>{formatTopicName(topic)}</Text>
                <Text style={styles.collectionSubtitle}>
                  Top-rated lessons and quizzes on this topic
                </Text>
              </View>
              <Pressable style={styles.seeAllButton} onPress={() => onTopicPress(topic)}>
                <Text style={styles.seeAllText}>See all</Text>
              </Pressable>
            </View>

            {/* Horizontal Scroll of Cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.collectionHorizontalScroll}
            >
              {items.map((item) => (
                <Pressable
                  key={item.uid}
                  style={styles.collectionCard}
                  onPress={() => onItemPress(item.uid)}
                >
                  <Image
                    source={item.coverImage}
                    style={styles.collectionCardImage}
                    contentFit="cover"
                  />
                  <View style={styles.collectionCardContent}>
                    <Text style={styles.collectionCardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ============================================================
// 主应用内容
// ============================================================
// Onboarding 存储 key
const ONBOARDING_COMPLETED_KEY = '@sparks/onboarding_completed';

function AppContent() {
  const [selectedPostUid, setSelectedPostUid] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [bottomTab, setBottomTab] = useState('explore');

  // 兴趣 Onboarding 状态
  const [showInterestsOnboarding, setShowInterestsOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 使用帖子缓存系统
  // 使用帖子缓存系统
  const {
    displayedPosts: feedItems,
    isLoading: feedLoading,
    error: feedError,
    refetch: refetchFeed,
    updateLocalLike: updateFeedLike,
    removePost: removeFeedPost,
    consumeMultiple,
    hasMore,
    cacheStatus
  } = usePostCache();

  const { removeFromHistory } = usePostHistory();
  const { unsavePost } = useSaved();

  // 收藏系统（用于刷新）
  const { refreshSavedPosts } = useSaved();

  // 兼容旧的 status 变量
  const feedStatus = feedLoading ? 'loading' : feedError ? 'error' : 'success';

  const currentPostIndex = feedItems ? feedItems.findIndex(p => p.uid === selectedPostUid) : -1;

  const { token, user } = useAuth();

  // Auto redirect to profile if logged in and on Auth screen (handled by conditional rendering)
  // But if we just logged in, we might want to switch tab to 'me' if not already?
  // The requirement says "After login/signup, redirect to /profile."
  // Since 'me' tab renders Profile or Auth based on token, we just need to switch tab to 'me'.
  // We can watch for token change.
  const prevTokenRef = useRef<string | null>(null);
  useEffect(() => {
    if (!prevTokenRef.current && token) {
      // Just logged in
      setBottomTab('me');
    }
    prevTokenRef.current = token;
  }, [token]);

  // 检测是否需要显示兴趣 Onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      if (!token || !user) {
        setOnboardingChecked(true);
        return;
      }

      try {
        // 使用用户 ID 作为 key 的一部分，这样不同用户有独立的 onboarding 状态
        const key = `${ONBOARDING_COMPLETED_KEY}_${user.userid}`;
        const completed = await AsyncStorage.getItem(key);

        if (!completed) {
          // 用户尚未完成 onboarding
          console.log('[Onboarding] First time user, showing interests selection');
          setShowInterestsOnboarding(true);
        }
      } catch (error) {
        console.log('[Onboarding] Failed to check status:', error);
      }

      setOnboardingChecked(true);
    };

    checkOnboarding();
  }, [token, user]);

  // 完成 Onboarding 的回调
  // 后端会清除所有用户数据（历史、收藏、点赞、评论），需要同步刷新前端状态
  const handleOnboardingComplete = useCallback(async () => {
    if (user) {
      try {
        const key = `${ONBOARDING_COMPLETED_KEY}_${user.userid}`;
        await AsyncStorage.setItem(key, 'true');
        console.log('[Onboarding] Marked as completed');
      } catch (error) {
        console.log('[Onboarding] Failed to save status:', error);
      }
    }
    setShowInterestsOnboarding(false);

    // 刷新所有相关数据（后端会清空用户数据）
    console.log('[Onboarding] Refreshing all user data...');
    refetchFeed();           // 刷新帖子推荐
    refreshSavedPosts();     // 刷新收藏列表（会变空）
  }, [user, refetchFeed, refreshSavedPosts]);

  const handlePullToRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchFeed();
    } catch (e) {
      console.error('Pull to refresh failed', e);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchFeed]);

  // Reset internal states when switching tabs
  useEffect(() => {
    setSelectedTopic(null);
  }, [bottomTab]);

  // 渲染当前页面内容
  const renderContent = () => {
    switch (bottomTab) {
      case 'explore':
        // 处理加载状态
        if (feedStatus === 'loading' && feedItems.length === 0) {
          return (
            <>
              <Header onSearchPress={() => setShowSearchModal(true)} />
              <LoadingScreen />
            </>
          );
        }

        // 处理错误状态
        if (feedStatus === 'error' && feedItems.length === 0) {
          return (
            <>
              <Header onSearchPress={() => setShowSearchModal(true)} />
              <ErrorScreen
                message={feedError || 'Unknown error'}
                onRetry={refetchFeed}
              />
            </>
          );
        }

        // 检测滚动到底部，加载更多帖子
        const handleFeedScroll = (event: any) => {
          const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
          const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;

          if (isNearBottom && hasMore && !feedLoading) {
            console.log('[Feed] Near bottom, loading more...');
            consumeMultiple(2);
          }
        };

        return (
          <>
            {/* 顶部 Header */}
            <Header onSearchPress={() => setShowSearchModal(true)} />

            {/* 信息流 */}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              onScroll={handleFeedScroll}
              scrollEventThrottle={400}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handlePullToRefresh}
                  tintColor={colors.primary}
                />
              }
            >
              <MasonryFeed
                items={feedItems}
                onItemPress={(uid) => setSelectedPostUid(uid)}
              />
              {feedLoading ? (
                <View style={styles.loadingMore}>
                  <Text style={styles.loadingMoreText}>Loading...</Text>
                </View>
              ) : hasMore ? (
                <View style={styles.loadingMore}>
                  <Text style={styles.loadingMoreText}>Scroll for more • Cache: {cacheStatus.cachedCount}</Text>
                </View>
              ) : (
                <Text style={styles.endText}>— End of List —</Text>
              )}
            </ScrollView>
          </>
        );
      case 'collection':
        if (selectedTopic) {
          const topicItems = feedItems.filter(item => item.topic === selectedTopic);
          return (
            <>
              <Header
                title={formatTopicName(selectedTopic)}
                onBack={() => setSelectedTopic(null)}
                onSearchPress={() => setShowSearchModal(true)}
              />
              <ScrollView
                style={styles.collectionContainer}
                contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
              >
                <MasonryFeed items={topicItems} onItemPress={(uid) => setSelectedPostUid(uid)} />
                <Text style={styles.endText}>— End of Topic —</Text>
              </ScrollView>
            </>
          );
        }
        return (
          <>
            <Header title="Collection" onSearchPress={() => setShowSearchModal(true)} />
            <CollectionScreen
              items={feedItems}
              onItemPress={(uid) => setSelectedPostUid(uid)}
              onTopicPress={(topic) => setSelectedTopic(topic)}
            />
          </>
        );
      case 'saved':
        return <SavedScreen onItemPress={(uid) => setSelectedPostUid(uid)} />;
      case 'me':
        if (!token) return <AuthScreen />;
        if (showHistoryModal) {
          return (
            <HistoryScreen
              onItemPress={(uid) => setSelectedPostUid(uid)}
              onBack={() => setShowHistoryModal(false)}
            />
          );
        }
        if (showLikesModal) {
          return (
            <LikesScreen
              onItemPress={(uid) => setSelectedPostUid(uid)}
              onToggleLike={refetchFeed}
              onBack={() => setShowLikesModal(false)}
            />
          );
        }
        return (
          <ProfileScreen
            onItemPress={(uid) => setSelectedPostUid(uid)}
            onToggleLike={refetchFeed}
            onHistoryPress={() => setShowHistoryModal(true)}
            onLikesPress={() => setShowLikesModal(true)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaProvider>
      {/* 兴趣 Onboarding Modal */}
      <Modal
        visible={showInterestsOnboarding}
        animationType="slide"
        transparent={false}
        onRequestClose={() => { }} // 阻止关闭
      >
        <OnboardingScreen
          onComplete={handleOnboardingComplete}
        />
      </Modal>

      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar style="dark" />

        {renderContent()}

        {/* 底部导航 */}
        <BottomNav activeTab={bottomTab} onTabChange={setBottomTab} />

        {/* 帖子详情 Modal */}
        <Modal
          visible={selectedPostUid !== null}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setSelectedPostUid(null)}
        >
          {feedItems && feedItems.length > 0 && selectedPostUid ? (
            <PostSwiper
              items={feedItems}
              initialIndex={Math.max(0, currentPostIndex)}
              onClose={() => setSelectedPostUid(null)}
              onFeedLikeUpdate={updateFeedLike}
              onLoadMore={() => consumeMultiple(1)}
              onMissing={(uid) => {
                console.log('[App] Post missing handler:', uid);
                removeFeedPost(uid);
                removeFromHistory(uid);
                unsavePost(uid);

                // If it's the current post, we must close
                if (uid === selectedPostUid) {
                  setSelectedPostUid(null);
                  Alert.alert('Post Unavailable', 'This post has been deleted or is no longer available.');
                }
              }}
            />
          ) : (
            <View style={[styles.readerContainer, { justifyContent: 'center', alignItems: 'center' }]}>
              <LoadingScreen />
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setSelectedPostUid(null)}
              >
                <X size={24} color={colors.text} />
              </Pressable>
            </View>
          )}
        </Modal>

        {/* 搜索 Modal */}
        <Modal
          visible={showSearchModal}
          animationType="fade"
          presentationStyle="fullScreen"
          onRequestClose={() => setShowSearchModal(false)}
        >
          <SearchScreen
            items={feedItems}
            onItemPress={(uid) => {
              setShowSearchModal(false);
              setSelectedPostUid(uid);
            }}
            onClose={() => setShowSearchModal(false)}
          />
        </Modal>

        {/* Debug Panel */}
        <DebugPanel
          visible={showDebugPanel}
          onClose={() => setShowDebugPanel(false)}
          onResetComplete={() => {
            // 后端会清空所有用户数据，同步刷新前端
            console.log('[DebugPanel] Reset complete, refreshing all data...');
            refetchFeed();
            refreshSavedPosts();
          }}
        />

        {/* Debug Toggle Button (开发模式可见) */}
        {__DEV__ && (
          <Pressable
            style={styles.debugToggleButton}
            onPress={() => setShowDebugPanel(!showDebugPanel)}
          >
            <Bug size={20} color="#fff" />
          </Pressable>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ============================================================
// 主应用入口
// ============================================================
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RecommendationProvider>
          <PostCacheProvider>
            <SavedProvider>
              <HistoryProvider>
                <NotesProvider>
                  <AppContent />
                </NotesProvider>
              </HistoryProvider>
            </SavedProvider>
          </PostCacheProvider>
        </RecommendationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

// ============================================================
// 样式
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  headerIcon: {
    padding: 8,
  },

  // Top Tabs
  topTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  topTab: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  topTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  topTabTextActive: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 17,
  },
  topTabIndicator: {
    marginTop: 4,
    width: 20,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },

  // Bottom Nav
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.card,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
  },
  navItem: {
    alignItems: 'center',
    gap: 2,
    minWidth: 56,
  },
  navLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  mainButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mainButtonActive: {
    backgroundColor: colors.primaryDark,
    transform: [{ scale: 1.05 }],
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
  },

  // Masonry
  masonry: {
    flexDirection: 'row',
    gap: COLUMN_GAP,
  },
  column: {
    flex: 1,
    gap: COLUMN_GAP,
  },

  // Card
  card: {
    backgroundColor: colors.card,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    backgroundColor: colors.border,
  },
  cardContent: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topicInfo: {
    flex: 1,
    marginRight: 8,
  },
  topicName: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  likeCount: {
    fontSize: 11,
    color: colors.textMuted,
  },

  endText: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: 24,
  },

  // Placeholder
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  placeholderText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 16,
    color: colors.textMuted,
  },

  // Reader
  readerContainer: {
    flex: 1,
    backgroundColor: colors.card,
    alignSelf: 'stretch',
  },
  readerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  closeButton: {
    padding: 6,
  },
  pageIndicator: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  readerScroll: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.card,
  },
  readerScrollContent: {

  },
  closeButtonOverlay: {
    position: 'absolute',
    left: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 22,
  },
  noteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  noteModalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  noteModalInput: {
    fontSize: 16,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  noteModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
    paddingHorizontal: 16,
  },
  pageDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  pageDividerText: {
    fontSize: 13,
    color: colors.textMuted,
    marginHorizontal: 16,
    fontWeight: '500',
  },
  articleEnd: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  articleEndText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  pageDotsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotSmallActive: {
    backgroundColor: colors.primary,
    width: 16,
  },
  coverImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 1.2,
    backgroundColor: colors.border,
  },
  titleContainer: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 2,
  },
  postTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 32,
    marginBottom: 8,
    textAlign: 'left',
  },
  topicBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 0,
  },
  topicBadgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  blocksContainer: {
    width: '100%',
    paddingTop: 0,
    paddingHorizontal: 20,
  },
  blockH1: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 30,
    marginTop: 4,
    marginBottom: 6,
    textAlign: 'left',
  },
  blockH2: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 26,
    marginTop: 10,
    marginBottom: 4,
    textAlign: 'left',
  },
  blockH3: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 24,
    marginTop: 6,
    marginBottom: 2,
    textAlign: 'left',
  },
  blockParagraph: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: 6,
    width: '100%',
    textAlign: 'left',
  },
  blockBullets: {
    marginBottom: 10,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    fontSize: 16,
    color: colors.primary,
    marginRight: 10,
    lineHeight: 24,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 24,
    textAlign: 'left',
  },
  blockQuote: {
    marginBottom: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  quoteLine: {
    display: 'none',
  },
  quoteText: {
    fontSize: 15,
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 24,
    textAlign: 'left',
  },
  blockImage: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: 12,
  },
  imageBlockContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 0,
  },
  blockImageCaption: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 16, // Single source of spacing after image block
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },

  // Post Bottom Bar
  postBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    gap: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  noteInputContainer: {
    flex: 1,
    height: 44,
    backgroundColor: colors.bg,
    borderRadius: 22,
    justifyContent: 'center',
  },
  noteInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noteInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    maxHeight: 80,
    paddingVertical: 0,
  },
  notePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
  },
  notePlaceholderText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  closeNoteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    paddingLeft: 8,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  actionButtonText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  // Collection Screen Styles
  collectionContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  collectionSection: {
    marginTop: 24,
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  collectionHeaderLeft: {
    flex: 1,
    marginRight: 16,
  },
  collectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  collectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  seeAllButton: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  collectionHorizontalScroll: {
    paddingLeft: 16,
    paddingRight: 8,
  },
  collectionCard: {
    width: 160,
    backgroundColor: colors.card,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    // Elevation for Android
    elevation: 2,
  },
  collectionCardImage: {
    width: '100%',
    height: 160,
    backgroundColor: colors.border,
  },
  collectionCardContent: {
    padding: 12,
    height: 60,
    justifyContent: 'center',
  },
  collectionCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 18,
  },

  // Search Screen Styles
  searchContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.card,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  searchFieldContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    paddingHorizontal: 14,
    height: 44,
  },
  searchIconSmall: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    height: '100%',
    padding: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  cancelSearchButton: {
    paddingVertical: 8,
  },
  cancelSearchText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  searchHistoryContainer: {
    padding: 20,
  },
  searchHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  searchHistoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },
  searchHistoryTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  historyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  historyTagText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  noHistoryText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  noResultsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
    color: colors.textMuted,
  },

  // Error
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingHorizontal: 32,
    gap: 12,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  errorMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Modal close button
  modalCloseButton: {
    position: 'absolute',
    top: 60,
    left: 16,
    padding: 8,
    backgroundColor: colors.card,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // ============================================================
  // Saved Screen 样式
  // ============================================================
  savedContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  savedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  savedHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  savedHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  savedCountBadge: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  savedCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  savedClearButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.bg,
  },
  savedLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  savedLoadingText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  savedListContent: {
    padding: 16,
  },
  savedItemSeparator: {
    height: 12,
  },
  savedCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  savedCardInner: {
    flexDirection: 'row',
    padding: 12,
  },
  savedCardImage: {
    width: 80,
    height: 100,
    borderRadius: 10,
    backgroundColor: colors.border,
  },
  savedCardContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'space-between',
  },
  savedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  savedTopicBadge: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  savedTopicText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.primary,
  },
  savedCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
    marginTop: 6,
  },
  savedCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  savedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savedTimeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  savedDeleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.bg,
  },

  // Empty State
  savedEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  savedEmptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  savedEmptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  savedEmptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  savedEmptyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  savedEmptyHintText: {
    fontSize: 13,
    color: colors.textMuted,
  },

  // Comment Sheet
  commentSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT * 0.7,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 100,
  },
  commentSheetHeader: {
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSheetKnob: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  commentSheetClose: {
    position: 'absolute',
    right: 16,
    top: 10,
    padding: 4,
  },

  // Comment Styles
  commentSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 20,
  },
  commentHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  commentSortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 2,
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sortButtonActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sortButtonText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  sortButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  sortDivider: {
    width: 1,
    height: 10,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  commentAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.bg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  commentSendButton: {
    padding: 4,
  },
  commentLoginPrompt: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 12,
    marginBottom: 20,
  },
  commentsLoading: {
    padding: 20,
    alignItems: 'center',
  },
  commentList: {
    gap: 20,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.border,
  },
  commentContent: {
    flex: 1,
  },
  commentUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  commentTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  commentLikeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  commentLikeCount: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  commentText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  noComments: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 14,
    paddingVertical: 20,
  },

  // Modal Header Styles
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    height: 56,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalCloseButtonInline: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightArea: {
    minWidth: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 8,
  },
  headerClearButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.bg,
  },

  // ============================================================
  // History & Likes Screen Styles
  // ============================================================
  listContent: {
    paddingTop: 0,
    paddingHorizontal: 0,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  historyCardInner: {
    flex: 1,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  historyImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.bg,
    aspectRatio: 1, // Ensure it's always a square
  },
  historyImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.3 }], // Zoom in to remove any potential black bars/borders
  },
  historyPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  historyPlaceholderText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textMuted,
  },
  historyInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  historyDate: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
  },
  unlikeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: colors.accent + '20',
    ...Platform.select({
      ios: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textMuted,
    marginTop: 12,
    fontWeight: '500',
  },
  retryFooter: {
    padding: 24,
    alignItems: 'center',
  },
  retryFooterText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },

  // ============================================================
  // Debug Panel Styles
  // ============================================================
  debugToggleButton: {
    position: 'absolute',
    bottom: 140,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  debugPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 2000,
    maxHeight: '70%',
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  debugHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debugHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  debugExpandButton: {
    padding: 4,
  },
  debugCloseButton: {
    padding: 4,
  },
  debugContent: {
    padding: 16,
  },
  debugSection: {
    marginBottom: 20,
  },
  debugSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  debugClickCounter: {
    gap: 8,
  },
  debugClickBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  debugClickProgress: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  debugClickText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  debugLastSignal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primaryBg,
    padding: 12,
    borderRadius: 10,
  },
  debugSignalType: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  debugSignalPost: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  debugBucketList: {
    gap: 12,
  },
  debugBucketItem: {
    gap: 6,
  },
  debugBucketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debugBucketName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  debugBucketWeight: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  debugBucketBarBg: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  debugBucketBar: {
    height: '100%',
    borderRadius: 3,
  },
  debugEmptyText: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  debugResetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  debugResetButtonDisabled: {
    opacity: 0.6,
  },
  debugResetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  debugResetHint: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
});
