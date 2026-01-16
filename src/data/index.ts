/**
 * 数据层入口 - 统一管理所有数据获取
 * 
 * 架构说明：
 * ┌─────────────────────────────────────────────────────────────┐
 * │  index.ts (这个文件)                                         │
 * │  ↓ 数据转换层 - 将 API 数据转换为 App 内部格式                  │
 * │  ↓ 支持两种帖子格式：简单帖子 和 富文本帖子                      │
 * ├─────────────────────────────────────────────────────────────┤
 * │  简单帖子：只有 content 文本，需要解析为 blocks                 │
 * │  富文本帖子：已有 pages/blocks 结构，直接使用                   │
 * └─────────────────────────────────────────────────────────────┘
 */

import { ImageSource } from 'expo-image';
import postsData from './postsData.json';
import { POST_IMAGES, getCoverImage, getInlineImage } from './imageMap';
import { 
  ApiPost, 
  ApiSimplePost, 
  ApiRichPost, 
  ApiBlock,
  isRichPost, 
  isSimplePost 
} from '../api/types';

// ============================================================
// 类型定义 (App 内部使用)
// ============================================================

export interface ContentBlock {
  type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'image' | 'spacer' | 'bullets' | 'quote';
  text?: string;
  ref?: string;       // 图片引用，如 "img_1"
  imageUrl?: string;  // 图片直接 URL（用于后端返回的图片）
  items?: string[];   // bullets 列表项
  size?: 'sm' | 'md' | 'lg'; // spacer 大小
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
  // 图片数据
  coverImageUrl?: string;      // 封面图 URL（后端）
  inlineImages?: Map<string, string>; // 内嵌图片映射 id -> url
  // 社交数据
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
  // 社交数据
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
// 数据存储 (本地静态数据)
// ============================================================

const POSTS: Post[] = postsData as Post[];

const MOCK_USERS = [
  { id: 'u1', name: '哲学探索者', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=phil1' },
  { id: 'u2', name: '艺术漫游者', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=art2' },
  { id: 'u3', name: '阅读思考者', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=read3' },
  { id: 'u4', name: '逻辑迷宫', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=logic4' },
  { id: 'u5', name: '永恒追问', avatar: 'https://api.dicebear.com/7.x/avataaars/png?seed=quest5' },
];

// ============================================================
// API 数据转换函数
// ============================================================

/**
 * 将 API 返回的帖子转换为 FeedItem（用于信息流）
 */
export function apiPostToFeedItem(apiPost: ApiPost, index: number): FeedItem {
  // 根据帖子类型获取不同的数据
  if (isRichPost(apiPost)) {
    return richPostToFeedItem(apiPost, index);
  } else {
    return simplePostToFeedItem(apiPost, index);
  }
}

/**
 * 富文本帖子 → FeedItem
 */
function richPostToFeedItem(post: ApiRichPost, index: number): FeedItem {
  // 优先使用后端的封面图 URL
  let coverImage: ImageSource;
  if (post.cover_image?.url) {
    coverImage = { uri: post.cover_image.url };
  } else {
    // 回退到本地图片或占位图
    const localCover = getCoverImage(post.uid);
    coverImage = localCover || {
      uri: `https://via.placeholder.com/400x500/4f46e5/ffffff?text=${encodeURIComponent(post.title.slice(0, 10))}`,
    };
  }

  const author = post.author || 'AI 创作者';
  return {
    uid: post.uid,
    title: post.title,
    topic: post.topic || 'General',
    coverImage,
    likes: post.like_count || Math.floor(Math.random() * 500) + 100,
    isLiked: false,
    comments: post.collect_count ? Math.floor(post.collect_count * 0.3) : Math.floor(Math.random() * 50) + 10,
    user: {
      id: author,
      name: author,
      avatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${author}`,
    },
  };
}

/**
 * 简单帖子 → FeedItem
 */
function simplePostToFeedItem(post: ApiSimplePost, index: number): FeedItem {
  // 尝试获取本地封面图
  const localCover = getCoverImage(post.platform_post_id);
  const coverImage: ImageSource = localCover || {
    uri: `https://via.placeholder.com/400x500/4f46e5/ffffff?text=${encodeURIComponent(post.title.slice(0, 10))}`,
  };

  return {
    uid: post.platform_post_id,
    title: post.title,
    topic: post.tags[0] || 'General',
    coverImage,
    likes: post.like_count,
    isLiked: false,
    comments: Math.floor(post.collect_count * 0.3),
    user: {
      id: post.author,
      name: post.author,
      avatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${post.author}`,
    },
  };
}

/**
 * 将 API 返回的帖子转换为完整 Post（用于详情页）
 */
export function apiPostToPost(apiPost: ApiPost): Post {
  if (isRichPost(apiPost)) {
    return richPostToPost(apiPost);
  } else {
    return simplePostToPost(apiPost);
  }
}

/**
 * 富文本帖子 → Post
 */
function richPostToPost(apiPost: ApiRichPost): Post {
  // 构建内嵌图片映射
  const inlineImages = new Map<string, string>();
  if (apiPost.inline_images) {
    apiPost.inline_images.forEach(img => {
      if (img.id && img.url) {
        inlineImages.set(img.id, img.url);
      }
    });
  }

  // 转换 pages
  const pages: PostPage[] = apiPost.pages.map(page => ({
    index: page.index,
    blocks: page.blocks.map(block => convertApiBlock(block, inlineImages)),
  }));

  return {
    uid: apiPost.uid,
    title: apiPost.title,
    topic: apiPost.topic || 'General',
    pages,
    coverImageUrl: apiPost.cover_image?.url,
    inlineImages,
    author: apiPost.author,
    likeCount: apiPost.like_count,
    collectCount: apiPost.collect_count,
    createdAt: apiPost.created_at,
  };
}

/**
 * 转换 API Block 为 App Block
 */
function convertApiBlock(apiBlock: ApiBlock, inlineImages: Map<string, string>): ContentBlock {
  const block: ContentBlock = {
    type: apiBlock.type,
    text: apiBlock.text,
    ref: apiBlock.ref,
    items: apiBlock.items,
    size: apiBlock.size,
  };

  // 如果是图片 block，尝试获取图片 URL
  if (apiBlock.type === 'image' && apiBlock.ref) {
    const imageUrl = inlineImages.get(apiBlock.ref);
    if (imageUrl) {
      block.imageUrl = imageUrl;
    }
  }

  return block;
}

/**
 * 简单帖子 → Post（需要解析 content 文本）
 */
function simplePostToPost(apiPost: ApiSimplePost): Post {
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

  const PARAGRAPHS_PER_PAGE = 4;
  const pages: PostPage[] = [];
  
  for (let i = 0; i < paragraphs.length; i += PARAGRAPHS_PER_PAGE) {
    const pageBlocks: ContentBlock[] = [];
    const pageParagraphs = paragraphs.slice(i, i + PARAGRAPHS_PER_PAGE);
    
    if (i === 0) {
      pageBlocks.push({ type: 'h1', text: title });
    }
    
    pageParagraphs.forEach((para, idx) => {
      if (para.startsWith('#')) {
        const headerText = para.replace(/^#+\s*/, '');
        pageBlocks.push({ type: 'h2', text: headerText });
      } else if (para.match(/^【.+】/)) {
        pageBlocks.push({ type: 'h2', text: para });
      } else {
        pageBlocks.push({ type: 'paragraph', text: para });
      }
      
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
// 图片获取函数（支持本地和远程）
// ============================================================

/**
 * 获取帖子封面图
 * 优先使用 post.coverImageUrl（后端），否则使用本地图片
 */
export function getPostCoverImage(post: Post): ImageSource {
  // 后端 URL
  if (post.coverImageUrl) {
    return { uri: post.coverImageUrl };
  }
  // 本地图片
  const localCover = getCoverImage(post.uid);
  if (localCover) {
    return localCover;
  }
  // 占位图
  return {
    uri: `https://via.placeholder.com/400x500/4f46e5/ffffff?text=${encodeURIComponent(post.title.slice(0, 10))}`,
  };
}

/**
 * 获取帖子内嵌图片
 * 优先使用 block.imageUrl（后端），否则使用本地图片
 */
export function getBlockImage(post: Post, block: ContentBlock): ImageSource | undefined {
  // 使用 block 上直接保存的 URL
  if (block.imageUrl) {
    return { uri: block.imageUrl };
  }
  
  // 使用 post 的 inlineImages 映射
  if (block.ref && post.inlineImages) {
    const url = post.inlineImages.get(block.ref);
    if (url) {
      return { uri: url };
    }
  }
  
  // 回退到本地图片
  if (block.ref) {
    return getInlineImage(post.uid, block.ref);
  }
  
  return undefined;
}

// ============================================================
// 本地数据 API (保留原有接口，用于离线或回退)
// ============================================================

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

export function getPost(uid: string): Post | undefined {
  return POSTS.find(p => p.uid === uid);
}

export function getPostCover(uid: string): ImageSource | undefined {
  return getCoverImage(uid);
}

export function getPostImage(uid: string, ref: string): ImageSource | undefined {
  return getInlineImage(uid, ref);
}

export function getAllPostUids(): string[] {
  return POSTS.map(p => p.uid);
}

// ============================================================
// 导出
// ============================================================

export { getCoverImage, getInlineImage, POST_IMAGES };
