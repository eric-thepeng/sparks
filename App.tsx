/**
 * Sparks - 小红书风格
 * 瀑布流信息流 + 帖子详情 + 翻页阅读 + 保存功能
 */
import React, { useState, useRef, useCallback } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { 
  Heart, 
  ChevronLeft, 
  Search, 
  Bell,
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
} from 'lucide-react-native';

// 数据层
import { 
  getFeedItems, 
  getPost, 
  getPostCover, 
  getPostImage,
  FeedItem, 
  Post, 
  PostPage, 
  ContentBlock 
} from './src/data';

// Hooks
import { useFeedItems, usePost, useSavedPosts } from './src/hooks';

// Context
import { SavedProvider, useSaved } from './src/context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_GAP = 8;
const CARD_WIDTH = (SCREEN_WIDTH - 24 - COLUMN_GAP) / 2;

// 封面图原始尺寸 928x1152
const COVER_ASPECT_RATIO = 928 / 1152; // ≈ 0.806
const CARD_IMAGE_HEIGHT = CARD_WIDTH / COVER_ASPECT_RATIO;

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

// ============================================================
// 顶部导航 Tab
// ============================================================
function TopTabs({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const tabs = ['Following', 'Discover', 'Nearby'];
  
  return (
    <View style={styles.topTabs}>
      {tabs.map((tab) => (
        <Pressable
          key={tab}
          onPress={() => onTabChange(tab)}
          style={styles.topTab}
        >
          <Text style={[
            styles.topTabText,
            activeTab === tab && styles.topTabTextActive
          ]}>
            {tab}
          </Text>
          {activeTab === tab && <View style={styles.topTabIndicator} />}
        </Pressable>
      ))}
    </View>
  );
}

// ============================================================
// 顶部 Header
// ============================================================
function Header({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.headerIcon}>
        <Search size={22} color={colors.text} />
      </Pressable>
      
      <TopTabs activeTab={activeTab} onTabChange={onTabChange} />
      
      <Pressable style={styles.headerIcon}>
        <Bell size={22} color={colors.text} />
      </Pressable>
    </View>
  );
}

// ============================================================
// 底部导航
// ============================================================
function BottomNav({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const insets = useSafeAreaInsets();
  
  const items = [
    { key: 'collection', icon: LayoutGrid, label: 'Collection' },
    { key: 'saved', icon: Bookmark, label: 'Saved' },
    { key: 'explore', icon: Sparkles, label: '', isMain: true },
    { key: 'notes', icon: FileText, label: 'Notes' },
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
}: { 
  item: FeedItem; 
  onPress: () => void;
}) {
  return (
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
        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>
        
        {/* 底部：用户信息 + 点赞 */}
        <View style={styles.cardFooter}>
          <View style={styles.userInfo}>
            <Image
              source={{ uri: item.user.avatar }}
              style={styles.avatar}
            />
            <Text style={styles.userName} numberOfLines={1}>
              {item.user.name}
            </Text>
          </View>
          
          <Pressable style={styles.likeButton}>
            <Heart 
              size={14} 
              color={item.isLiked ? colors.accent : colors.textMuted}
              fill={item.isLiked ? colors.accent : 'transparent'}
            />
            <Text style={[
              styles.likeCount,
              item.isLiked && { color: colors.accent }
            ]}>
              {item.likes}
            </Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
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
        {leftColumn.map((item) => (
          <FeedCard
            key={item.uid}
            item={item}
            onPress={() => onItemPress(item.uid)}
          />
        ))}
      </View>
      
      {/* 右列 */}
      <View style={styles.column}>
        {rightColumn.map((item) => (
          <FeedCard
            key={item.uid}
            item={item}
            onPress={() => onItemPress(item.uid)}
          />
        ))}
      </View>
    </View>
  );
}

// ============================================================
// 帖子阅读器 - 连续滚动
// ============================================================
function PostReader({
  post,
  onClose,
}: {
  post: Post;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [noteText, setNoteText] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  
  // 保存功能 - 使用 Context
  const { isPostSaved, toggleSavePost } = useSaved();
  const isBookmarked = isPostSaved(post.uid);
  const [isSaving, setIsSaving] = useState(false);
  
  // 保存动画
  const saveScale = useRef(new Animated.Value(1)).current;
  
  // 记录每个页面分隔符的位置
  const pagePositions = useRef<number[]>([0]);

  // 渲染内容块
  const renderBlock = (block: ContentBlock, idx: number, pageIdx: number) => {
    const key = `${pageIdx}-${idx}`;
    switch (block.type) {
      case 'h1':
        return <Text key={key} style={styles.blockH1}>{block.text}</Text>;
      case 'h2':
        return <Text key={key} style={styles.blockH2}>{block.text}</Text>;
      case 'paragraph':
        return <Text key={key} style={styles.blockParagraph}>{block.text}</Text>;
      case 'image':
        const imageSource = getPostImage(post.uid, block.ref || '');
        if (!imageSource) return null;
        return (
          <Image
            key={key}
            source={imageSource}
            style={styles.blockImage}
            contentFit="cover"
          />
        );
      case 'spacer':
        return <View key={key} style={{ height: 24 }} />;
      default:
        return null;
    }
  };

  // 处理滚动更新当前页码
  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    // 找到当前所在页面
    let page = 0;
    for (let i = 0; i < pagePositions.current.length; i++) {
      if (y >= pagePositions.current[i] - 100) {
        page = i;
      }
    }
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  };

  // 处理收藏 - 带动画
  const handleBookmark = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    // 弹性动画
    Animated.sequence([
      Animated.spring(saveScale, {
        toValue: 1.3,
        useNativeDriver: true,
        friction: 3,
      }),
      Animated.spring(saveScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 3,
      }),
    ]).start();
    
    try {
      await toggleSavePost(post);
    } catch (err) {
      console.error('Failed to toggle save:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // 处理分享
  const handleShare = () => {
    // TODO: 实现分享功能
    console.log('Share post:', post.uid);
  };

  // 处理发送笔记
  const handleSendNote = () => {
    if (noteText.trim()) {
      console.log('Save note:', noteText);
      setNoteText('');
      setShowNoteInput(false);
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
            <View
              key={idx}
              style={[styles.dotSmall, currentPage === idx && styles.dotSmallActive]}
            />
          ))}
        </View>
        
        <Text style={styles.pageIndicator}>
          {currentPage + 1}/{post.pages.length}
        </Text>
      </View>

      {/* 连续滚动内容 */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.readerScroll}
        contentContainerStyle={[styles.readerScrollContent, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* 封面图 */}
        <Image
          source={getPostCover(post.uid)}
          style={styles.coverImage}
          contentFit="cover"
        />
        
        {/* 标题区域 */}
        <View style={styles.titleContainer}>
          <Text style={styles.postTitle}>{post.title}</Text>
          <View style={styles.topicBadge}>
            <Text style={styles.topicBadgeText}>#{post.topic}</Text>
          </View>
        </View>

        {/* 所有页面内容 */}
        {post.pages.map((page, pageIdx) => (
          <View 
            key={page.index}
            onLayout={(e) => {
              // 记录每页开始位置
              pagePositions.current[pageIdx] = e.nativeEvent.layout.y;
            }}
          >
            {/* 页面分隔符（第一页不显示） */}
            {pageIdx > 0 && (
              <View style={styles.pageDivider}>
                <View style={styles.pageDividerLine} />
                <Text style={styles.pageDividerText}>Page {pageIdx + 1}</Text>
                <View style={styles.pageDividerLine} />
              </View>
            )}
            
            {/* 页面内容块 */}
            <View style={styles.blocksContainer}>
              {page.blocks.map((block, idx) => renderBlock(block, idx, pageIdx))}
            </View>
          </View>
        ))}

        {/* 文章结束 */}
        <View style={styles.articleEnd}>
          <Text style={styles.articleEndText}>— The End —</Text>
        </View>
      </ScrollView>

      {/* 底部操作栏 */}
      <View 
        style={[styles.postBottomBar, { paddingBottom: insets.bottom }]}
      >
        {/* 笔记输入区域 - 占2/3宽度 */}
        <Pressable 
          style={styles.noteInputContainer}
          onPress={() => setShowNoteInput(true)}
        >
          {showNoteInput ? (
            <View style={styles.noteInputWrapper}>
              <TextInput
                style={styles.noteInput}
                placeholder="Write a note..."
                placeholderTextColor={colors.textMuted}
                value={noteText}
                onChangeText={setNoteText}
                autoFocus
                multiline
                maxLength={500}
              />
              {noteText.trim() ? (
                <Pressable style={styles.sendButton} onPress={handleSendNote}>
                  <Send size={18} color="#fff" />
                </Pressable>
              ) : (
                <Pressable style={styles.closeNoteButton} onPress={() => setShowNoteInput(false)}>
                  <X size={18} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.notePlaceholder}>
              <Pencil size={16} color={colors.textMuted} />
              <Text style={styles.notePlaceholderText}>Write a note...</Text>
            </View>
          )}
        </Pressable>

        {/* 操作按钮区域 - 占1/3宽度 */}
        <View style={styles.actionButtons}>
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
    </KeyboardAvoidingView>
  );
}

// ============================================================
// 占位页面
// ============================================================
function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>{title}</Text>
      <Text style={styles.placeholderSubtext}>Coming soon...</Text>
    </View>
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
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  // 渲染空状态
  const renderEmptyState = () => (
    <View style={styles.savedEmptyContainer}>
      <View style={styles.savedEmptyIcon}>
        <BookmarkPlus size={48} color={colors.primaryLight} strokeWidth={1.5} />
      </View>
      <Text style={styles.savedEmptyTitle}>No Saved Posts</Text>
      <Text style={styles.savedEmptySubtitle}>
        Tap Save while reading posts{'\n'}to revisit them anytime
      </Text>
      <View style={styles.savedEmptyHint}>
        <Bookmark size={16} color={colors.textMuted} />
        <Text style={styles.savedEmptyHintText}>Tap Save to start collecting</Text>
      </View>
    </View>
  );

  // 渲染保存项
  const renderSavedItem = ({ item, index }: { item: typeof savedPosts[0]; index: number }) => {
    const localCover = getPostCover(item.uid);
    
    return (
      <Animated.View 
        style={[
          styles.savedCard,
          { opacity: 1 }
        ]}
      >
        <Pressable 
          style={styles.savedCardInner}
          onPress={() => onItemPress(item.uid)}
        >
          {/* 封面图 */}
          <Image
            source={localCover || { uri: item.coverImageUri || `https://via.placeholder.com/120x150/4f46e5/ffffff?text=${encodeURIComponent(item.title.slice(0, 5))}` }}
            style={styles.savedCardImage}
            contentFit="cover"
            transition={200}
          />
          
          {/* 内容 */}
          <View style={styles.savedCardContent}>
            <View style={styles.savedCardHeader}>
              <View style={styles.savedTopicBadge}>
                <Text style={styles.savedTopicText}>#{item.topic}</Text>
              </View>
            </View>
            
            <Text style={styles.savedCardTitle} numberOfLines={2}>
              {item.title}
            </Text>
            
            <View style={styles.savedCardFooter}>
              <View style={styles.savedTimeRow}>
                <Clock size={12} color={colors.textMuted} />
                <Text style={styles.savedTimeText}>
                  {formatSavedTime(item.savedAt)}
                </Text>
              </View>
            </View>
          </View>
          
          {/* 删除按钮 */}
          <Pressable 
            style={styles.savedDeleteButton}
            onPress={() => handleUnsave(item.uid, item.title)}
            hitSlop={8}
          >
            <X size={18} color={colors.textMuted} />
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
// Loading 状态组件
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
// 主应用
// ============================================================
export default function App() {
  const [selectedPostUid, setSelectedPostUid] = useState<string | null>(null);
  const [topTab, setTopTab] = useState('Discover');
  const [bottomTab, setBottomTab] = useState('explore');
  
  // 使用 hooks 获取数据
  const { 
    feedItems, 
    status: feedStatus, 
    error: feedError, 
    refetch: refetchFeed 
  } = useFeedItems();
  
  const { 
    post: selectedPost, 
    status: postStatus, 
    error: postError,
    refetch: refetchPost 
  } = usePost(selectedPostUid);

  // 渲染当前页面内容
  const renderContent = () => {
    switch (bottomTab) {
      case 'explore':
        // 处理加载状态
        if (feedStatus === 'loading' && feedItems.length === 0) {
          return (
            <>
              <Header activeTab={topTab} onTabChange={setTopTab} />
              <LoadingScreen />
            </>
          );
        }
        
        // 处理错误状态
        if (feedStatus === 'error' && feedItems.length === 0) {
          return (
            <>
              <Header activeTab={topTab} onTabChange={setTopTab} />
              <ErrorScreen 
                message={feedError || 'Unknown error'} 
                onRetry={refetchFeed} 
              />
            </>
          );
        }
        
        return (
          <>
            {/* 顶部 Header */}
            <Header activeTab={topTab} onTabChange={setTopTab} />
            
            {/* 信息流 */}
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <MasonryFeed 
                items={feedItems} 
                onItemPress={(uid) => setSelectedPostUid(uid)}
              />
              {feedStatus === 'loading' ? (
                <View style={styles.loadingMore}>
                  <Text style={styles.loadingMoreText}>Loading...</Text>
                </View>
              ) : (
                <Text style={styles.endText}>— End of List —</Text>
              )}
            </ScrollView>
          </>
        );
      case 'collection':
        return <PlaceholderScreen title="Collection" />;
      case 'saved':
        return <SavedScreen onItemPress={(uid) => setSelectedPostUid(uid)} />;
      case 'notes':
        return <PlaceholderScreen title="Notes" />;
      case 'me':
        return <PlaceholderScreen title="Me" />;
      default:
        return null;
    }
  };

  return (
    <SavedProvider>
      <SafeAreaProvider>
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
            {postStatus === 'loading' ? (
              <View style={[styles.readerContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                <LoadingScreen />
                <Pressable 
                  style={styles.modalCloseButton} 
                  onPress={() => setSelectedPostUid(null)}
                >
                  <X size={24} color={colors.text} />
                </Pressable>
              </View>
            ) : postStatus === 'error' ? (
              <View style={[styles.readerContainer, { justifyContent: 'center', alignItems: 'center' }]}>
                <ErrorScreen 
                  message={postError || 'Failed to load post'} 
                  onRetry={refetchPost} 
                />
                <Pressable 
                  style={styles.modalCloseButton} 
                  onPress={() => setSelectedPostUid(null)}
                >
                  <X size={24} color={colors.text} />
                </Pressable>
              </View>
            ) : selectedPost ? (
              <PostReader
                post={selectedPost}
                onClose={() => setSelectedPostUid(null)}
              />
            ) : null}
          </Modal>
        </SafeAreaView>
      </SafeAreaProvider>
    </SavedProvider>
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.border,
    marginRight: 4,
  },
  userName: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
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
  },
  readerScrollContent: {
    
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
    padding: 16,
  },
  postTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 30,
    marginBottom: 12,
  },
  topicBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  topicBadgeText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  blocksContainer: {
    paddingHorizontal: 16,
  },
  blockH1: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 30,
    marginTop: 8,
    marginBottom: 12,
  },
  blockH2: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 26,
    marginTop: 20,
    marginBottom: 10,
  },
  blockParagraph: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: 12,
  },
  blockImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginVertical: 12,
    backgroundColor: colors.border,
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
  },
  noteInputContainer: {
    flex: 3,
    height: 44,
    backgroundColor: colors.bg,
    borderRadius: 22,
    justifyContent: 'center',
  },
  noteInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
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
    paddingHorizontal: 14,
    gap: 8,
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
    marginLeft: 8,
  },
  closeNoteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  actionButtons: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
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
});
