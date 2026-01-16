/**
 * 数据层入口 - 统一管理所有数据获取
 * 
 * 架构说明（对比 Unity）：
 * ┌─────────────────────────────────────────────────────────────┐
 * │  index.ts (这个文件)                                         │
 * │  ↓ 类似 Unity 的 ResourceManager / DataManager               │
 * │  ↓ 对外暴露统一的 API，隐藏内部实现细节                        │
 * ├─────────────────────────────────────────────────────────────┤
 * │  当前：支持本地 JSON 和 API 两种数据源                         │
 * │  通过 hooks 获取 API 数据，通过函数获取本地数据                 │
 * └─────────────────────────────────────────────────────────────┘
 */

import { ImageSource } from 'expo-image';
import postsData from './postsData.json';
import { POST_IMAGES, getCoverImage, getInlineImage } from './imageMap';
import { ApiPost } from '../api/types';

// ============================================================
// 类型定义 (类似 Unity 中的 ScriptableObject 结构)
// ============================================================

export interface ContentBlock {
  type: 'h1' | 'h2' | 'paragraph' | 'image' | 'spacer';
  text?: string;
  ref?: string;  // 图片引用，如 "img_1"
}

export interface PostPage {
  index: number;
  blocks: ContentBlock[];
}

export interface Post {
  uid: string;
  title: string;
  topic: string;
  pages: PostPage[];
  // API 数据扩展字段
  author?: string;
  likeCount?: number;
  collectCount?: number;
  createdAt?: string;
}

export interface FeedItem {
  uid: string;
  title: string;
  topic: string;
  coverImage: ImageSource;
  // 以下是社交数据
  likes: number;
  isLiked: boolean;
  comments: number;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
}

// ============================================================
// 数据存储 (类似 Unity 的 静态数据表)
// ============================================================

const POSTS: Post[] = postsData as Post[];

// 模拟用户数据
const MOCK_USERS = [
  { id: 'u1', name: '哲学探索者', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=phil1' },
  { id: 'u2', name: '艺术漫游者', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=art2' },
  { id: 'u3', name: '阅读思考者', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=read3' },
  { id: 'u4', name: '逻辑迷宫', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=logic4' },
  { id: 'u5', name: '永恒追问', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=quest5' },
];

// 默认占位封面图
const DEFAULT_COVER: ImageSource = {
  uri: 'https://via.placeholder.com/400x500/4f46e5/ffffff?text=Spark',
};

// ============================================================
// API 数据转换函数
// ============================================================

/**
 * 将 API 返回的帖子转换为 FeedItem
 */
export function apiPostToFeedItem(apiPost: ApiPost, index: number): FeedItem {
  // 尝试获取本地封面图，如果没有则使用网络占位图
  const localCover = getCoverImage(apiPost.platform_post_id);
  const coverImage: ImageSource = localCover || {
    uri: `https://via.placeholder.com/400x500/4f46e5/ffffff?text=${encodeURIComponent(apiPost.title.slice(0, 10))}`,
  };

  // 根据作者名生成用户信息
  const user = {
    id: apiPost.author,
    name: apiPost.author,
    avatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${apiPost.author}`,
  };

  return {
    uid: apiPost.platform_post_id,
    title: apiPost.title,
    topic: apiPost.tags[0] || 'General',
    coverImage,
    likes: apiPost.like_count,
    isLiked: false,
    comments: Math.floor(apiPost.collect_count * 0.3), // 模拟评论数
    user,
  };
}

/**
 * 将 API 返回的帖子转换为完整 Post（带 pages 结构）
 * 由于 API 返回的是纯文本 content，我们需要解析并转换为 blocks
 */
export function apiPostToPost(apiPost: ApiPost): Post {
  // 将 content 解析为 pages 和 blocks
  const pages = parseContentToPages(apiPost.content, apiPost.title);

  return {
    uid: apiPost.platform_post_id,
    title: apiPost.title,
    topic: apiPost.tags[0] || 'General',
    pages,
    author: apiPost.author,
    likeCount: apiPost.like_count,
    collectCount: apiPost.collect_count,
    createdAt: apiPost.created_at,
  };
}

/**
 * 将纯文本内容解析为 pages 和 blocks 结构
 */
function parseContentToPages(content: string, title: string): PostPage[] {
  // 按段落分割内容
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim());
  
  if (paragraphs.length === 0) {
    return [{
      index: 1,
      blocks: [
        { type: 'h1', text: title },
        { type: 'paragraph', text: content || '暂无内容' },
      ],
    }];
  }

  // 每 3-4 个段落分一页
  const PARAGRAPHS_PER_PAGE = 4;
  const pages: PostPage[] = [];
  
  for (let i = 0; i < paragraphs.length; i += PARAGRAPHS_PER_PAGE) {
    const pageBlocks: ContentBlock[] = [];
    const pageParagraphs = paragraphs.slice(i, i + PARAGRAPHS_PER_PAGE);
    
    // 第一页添加标题
    if (i === 0) {
      pageBlocks.push({ type: 'h1', text: title });
    }
    
    // 添加段落
    pageParagraphs.forEach((para, idx) => {
      // 检查是否是标题行（以 # 或 【】 开头）
      if (para.startsWith('#')) {
        const headerText = para.replace(/^#+\s*/, '');
        pageBlocks.push({ type: 'h2', text: headerText });
      } else if (para.match(/^【.+】/)) {
        pageBlocks.push({ type: 'h2', text: para });
      } else {
        pageBlocks.push({ type: 'paragraph', text: para });
      }
      
      // 每2个段落后添加间隔
      if (idx > 0 && idx % 2 === 1) {
        pageBlocks.push({ type: 'spacer' });
      }
    });
    
    pages.push({
      index: pages.length + 1,
      blocks: pageBlocks,
    });
  }
  
  return pages;
}

// ============================================================
// 本地数据 API (保留原有接口，用于离线或回退)
// ============================================================

/**
 * 获取本地 Feed 列表数据
 * 类似 Unity: FeedManager.GetFeedItems()
 */
export function getFeedItems(): FeedItem[] {
  return POSTS.map((post, index) => ({
    uid: post.uid,
    title: post.title,
    topic: post.topic,
    coverImage: getCoverImage(post.uid)!,
    likes: [234, 567, 890, 123, 345][index % 5],
    isLiked: index === 1,
    comments: [42, 89, 156, 28, 67][index % 5],
    user: MOCK_USERS[index % MOCK_USERS.length],
  }));
}

/**
 * 根据 UID 获取本地完整帖子数据
 * 类似 Unity: PostManager.GetPost(uid)
 */
export function getPost(uid: string): Post | undefined {
  return POSTS.find(p => p.uid === uid);
}

/**
 * 获取帖子封面图
 * 类似 Unity: Resources.Load<Sprite>(path)
 */
export function getPostCover(uid: string): ImageSource | undefined {
  return getCoverImage(uid);
}

/**
 * 获取帖子内嵌图片
 * 类似 Unity: Resources.Load<Sprite>(path)
 * @param uid 帖子 ID
 * @param ref 图片引用，如 "img_1"
 */
export function getPostImage(uid: string, ref: string): ImageSource | undefined {
  return getInlineImage(uid, ref);
}

/**
 * 获取所有帖子 UID 列表
 * 用于预加载或调试
 */
export function getAllPostUids(): string[] {
  return POSTS.map(p => p.uid);
}

// ============================================================
// 导出
// ============================================================

export { getCoverImage, getInlineImage, POST_IMAGES };
