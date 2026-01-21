/**
 * 数据层入口 - 统一管理所有数据获取
 * 
 * 架构说明：
 * ┌─────────────────────────────────────────────────────────────┐
 * │  index.ts (这个文件)                                         │
 * │  ↓ 数据转换层 - 将 API 数据转换为 App 内部格式                  │
 * │  ↓ 支持两种帖子格式：                                          │
 * │    - RichPost: 已有 pages/blocks 结构，直接使用               │
 * │    - SimplePost: 只有 content 文本，需要解析为 blocks          │
 * └─────────────────────────────────────────────────────────────┘
 */

import { ImageSource } from 'expo-image';
import postsData from './postsData.json';
import { POST_IMAGES, getCoverImage, getInlineImage } from './imageMap';
import { ApiPost } from '../api/types';

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
  isLiked?: boolean;
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
// 类型判断辅助函数
// ============================================================

/**
 * 判断是否是 RichPost（有 pages 数组）
 */
function hasPages(post: any): boolean {
  return post.pages && Array.isArray(post.pages) && post.pages.length > 0;
}

// ============================================================
// API 数据转换函数
// ============================================================

/**
 * 将 API 返回的帖子转换为 FeedItem（用于信息流）
 */
export function apiPostToFeedItem(apiPost: ApiPost, index: number): FeedItem {
  const post = apiPost as any;
  
  if (hasPages(post)) {
    return richPostToFeedItem(post, index);
  } else {
    return simplePostToFeedItem(post, index);
  }
}

/**
 * RichPost → FeedItem
 */
function richPostToFeedItem(post: any, index: number): FeedItem {
  const postUid = post.uid || post.platform_post_id || `unknown-${index}`;
  const title = post.title || post.headline || 'Untitled';
  
  let coverImage: ImageSource;
  if (post.cover_image?.url) {
    coverImage = { uri: post.cover_image.url };
  } else {
    const localCover = getCoverImage(postUid);
    coverImage = localCover || {
      uri: `https://via.placeholder.com/400x500/4f46e5/ffffff?text=${encodeURIComponent(title.slice(0, 10))}`,
    };
  }

  const author = post.author || 'AI 创作者';
  return {
    uid: postUid,
    title,
    topic: post.topic || post.bucket_key || 'General',
    coverImage,
    likes: post.like_count || 0,
    isLiked: !!post.is_liked,
    comments: post.collect_count ? Math.floor(post.collect_count * 0.3) : Math.floor(Math.random() * 50) + 10,
    user: {
      id: author,
      name: author,
      avatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${author}`,
    },
  };
}

/**
 * 从 content 文本中提取第一张 Markdown 图片 URL
 */
function extractCoverImageFromContent(content: string): { coverUrl: string | null; contentWithoutCover: string } {
  const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/;
  const match = content.match(markdownImageRegex);
  
  if (match) {
    const contentWithoutCover = content.replace(match[0], '').trim();
    return {
      coverUrl: match[2],
      contentWithoutCover,
    };
  }
  
  return {
    coverUrl: null,
    contentWithoutCover: content,
  };
}

/**
 * SimplePost → FeedItem
 */
function simplePostToFeedItem(post: any, index: number): FeedItem {
  const postUid = post.platform_post_id || post.uid || `unknown-${index}`;
  const title = post.title || 'Untitled';
  
  // 从 content 中提取封面图
  const { coverUrl } = extractCoverImageFromContent(post.content || '');
  
  let coverImage: ImageSource;
  if (coverUrl) {
    coverImage = { uri: coverUrl };
  } else {
    const localCover = getCoverImage(postUid);
    coverImage = localCover || {
      uri: `https://via.placeholder.com/400x500/4f46e5/ffffff?text=${encodeURIComponent(title.slice(0, 10))}`,
    };
  }

  const author = post.author || 'AI 创作者';
  const tags = post.tags || [];
  
  return {
    uid: postUid,
    title,
    topic: tags[0] || 'General',
    coverImage,
    likes: post.like_count || 0,
    isLiked: !!post.is_liked,
    comments: post.collect_count ? Math.floor(post.collect_count * 0.3) : Math.floor(Math.random() * 50) + 10,
    user: {
      id: author,
      name: author,
      avatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${author}`,
    },
  };
}

/**
 * 将 API 返回的帖子转换为完整 Post（用于详情页）
 */
export function apiPostToPost(apiPost: ApiPost): Post {
  const post = apiPost as any;
  
  if (hasPages(post)) {
    console.log('[apiPostToPost] RichPost detected, using backend pages');
    return richPostToPost(post);
  } else {
    console.log('[apiPostToPost] SimplePost detected, parsing content');
    return simplePostToPost(post);
  }
}

/**
 * RichPost → Post
 */
function richPostToPost(post: any): Post {
  const postUid = post.uid || post.platform_post_id || 'unknown';
  const title = post.title || post.headline || 'Untitled';
  
  // 构建内嵌图片映射
  const inlineImages = new Map<string, string>();
  if (post.inline_images && Array.isArray(post.inline_images)) {
    post.inline_images.forEach((img: any) => {
      if (img.id && img.url) {
        inlineImages.set(img.id, img.url);
      }
    });
  }
  console.log('[richPostToPost] Inline images count:', inlineImages.size);

  // 直接使用后端的 pages 结构
  const pages: PostPage[] = post.pages.map((page: any) => ({
    index: page.index || 1,
    blocks: Array.isArray(page.blocks) 
      ? page.blocks.map((block: any) => convertApiBlock(block, inlineImages))
      : [],
  }));
  
  console.log('[richPostToPost] Using backend pages:', pages.length);
  console.log('[richPostToPost] Cover URL:', post.cover_image?.url);
  
  // 统计图片数量
  let imageCount = 0;
  pages.forEach(page => {
    page.blocks.forEach(block => {
      if (block.type === 'image') imageCount++;
    });
  });
  console.log('[richPostToPost] Total image blocks:', imageCount);

  return {
    uid: postUid,
    title,
    topic: post.topic || post.bucket_key || 'General',
    pages,
    coverImageUrl: post.cover_image?.url,
    inlineImages,
    author: post.author,
    likeCount: post.like_count,
    collectCount: post.collect_count,
    createdAt: post.created_at,
    isLiked: !!post.is_liked,
  };
}

/**
 * 转换 API Block 为 App Block
 */
function convertApiBlock(apiBlock: any, inlineImages: Map<string, string>): ContentBlock {
  const blockType = apiBlock.type || 'paragraph';
  
  const block: ContentBlock = {
    type: blockType,
    text: apiBlock.text,
    ref: apiBlock.ref,
    items: apiBlock.items,
    size: apiBlock.size,
  };

  if (blockType === 'image' && apiBlock.ref) {
    const imageUrl = inlineImages.get(apiBlock.ref);
    if (imageUrl) {
      block.imageUrl = imageUrl;
    }
  }

  return block;
}

/**
 * SimplePost → Post（解析 content 文本）
 */
function simplePostToPost(post: any): Post {
  const postUid = post.platform_post_id || post.uid || 'unknown';
  const title = post.title || 'Untitled';
  const content = post.content || '';
  const tags = post.tags || [];
  
  // 提取封面图
  const { coverUrl, contentWithoutCover } = extractCoverImageFromContent(content);
  
  // 解析 content 为 pages
  const pages = parseContentToPages(contentWithoutCover, title);
  
  console.log('[simplePostToPost] Parsed content into', pages.length, 'pages');
  console.log('[simplePostToPost] Cover URL:', coverUrl);
  
  // 统计图片数量
  let imageCount = 0;
  pages.forEach(page => {
    page.blocks.forEach(block => {
      if (block.type === 'image') imageCount++;
    });
  });
  console.log('[simplePostToPost] Total images in pages:', imageCount);

  return {
    uid: postUid,
    title,
    topic: tags[0] || 'General',
    pages,
    coverImageUrl: coverUrl || undefined,
    author: post.author,
    likeCount: post.like_count,
    collectCount: post.collect_count,
    createdAt: post.created_at,
    isLiked: !!post.is_liked,
  };
}

// ============================================================
// Content 解析函数（SimplePost 使用）
// ============================================================

/**
 * 分页标记：后端可以在 content 中使用这些标记来控制分页
 */
const PAGE_BREAK_PATTERN = /\n(?:---+|<!--\s*page-break\s*-->|\[PAGE_BREAK\])\n/gi;

/**
 * 将纯文本内容解析为 pages 和 blocks 结构
 */
function parseContentToPages(content: string, title: string): PostPage[] {
  // 检查是否有分页标记
  const hasPageBreaks = PAGE_BREAK_PATTERN.test(content);
  PAGE_BREAK_PATTERN.lastIndex = 0;
  
  if (hasPageBreaks) {
    return parseContentWithPageBreaks(content, title);
  } else {
    return parseContentWithFallback(content, title);
  }
}

/**
 * 根据分页标记解析内容
 */
function parseContentWithPageBreaks(content: string, title: string): PostPage[] {
  const pageContents = content.split(PAGE_BREAK_PATTERN).filter(p => p.trim());
  
  if (pageContents.length === 0) {
    return [{
      index: 1,
      blocks: [
        { type: 'h1', text: title },
        { type: 'paragraph', text: content || '暂无内容' },
      ],
    }];
  }
  
  const pages: PostPage[] = [];
  
  pageContents.forEach((pageContent, pageIdx) => {
    const pageBlocks: ContentBlock[] = [];
    
    if (pageIdx === 0) {
      pageBlocks.push({ type: 'h1', text: title });
    }
    
    const paragraphs = pageContent.split(/\n\n+/).filter(p => p.trim());
    paragraphs.forEach((para, idx) => {
      parseAndAddBlocks(para, pageBlocks);
      if (idx > 0 && idx % 2 === 1) {
        pageBlocks.push({ type: 'spacer' });
      }
    });
    
    pages.push({
      index: pages.length + 1,
      blocks: pageBlocks,
    });
  });
  
  return pages;
}

/**
 * 默认分页逻辑（每 8 段落一页）
 */
function parseContentWithFallback(content: string, title: string): PostPage[] {
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

  const PARAGRAPHS_PER_PAGE = 8;
  const pages: PostPage[] = [];
  
  for (let i = 0; i < paragraphs.length; i += PARAGRAPHS_PER_PAGE) {
    const pageBlocks: ContentBlock[] = [];
    const pageParagraphs = paragraphs.slice(i, i + PARAGRAPHS_PER_PAGE);
    
    if (i === 0) {
      pageBlocks.push({ type: 'h1', text: title });
    }
    
    pageParagraphs.forEach((para, idx) => {
      parseAndAddBlocks(para, pageBlocks);
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

/**
 * 解析单个段落并添加到 blocks 数组
 */
function parseAndAddBlocks(para: string, pageBlocks: ContentBlock[]): void {
  const markdownImageRegex = /^!\[([^\]]*)\]\(([^)]+)\)$/;
  
  const imageMatch = para.trim().match(markdownImageRegex);
  if (imageMatch) {
    pageBlocks.push({ 
      type: 'image', 
      imageUrl: imageMatch[2],
      text: imageMatch[1],
    });
  } else if (para.startsWith('#')) {
    const headerText = para.replace(/^#+\s*/, '');
    pageBlocks.push({ type: 'h2', text: headerText });
  } else if (para.match(/^【.+】/)) {
    pageBlocks.push({ type: 'h2', text: para });
  } else {
    // 检查内嵌图片
    const inlineImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;
    let hasInlineImages = false;
    
    while ((match = inlineImageRegex.exec(para)) !== null) {
      hasInlineImages = true;
      const textBefore = para.slice(lastIndex, match.index).trim();
      if (textBefore) {
        pageBlocks.push({ type: 'paragraph', text: textBefore });
      }
      pageBlocks.push({
        type: 'image',
        imageUrl: match[2],
        text: match[1],
      });
      lastIndex = match.index + match[0].length;
    }
    
    if (hasInlineImages) {
      const textAfter = para.slice(lastIndex).trim();
      if (textAfter) {
        pageBlocks.push({ type: 'paragraph', text: textAfter });
      }
    } else {
      pageBlocks.push({ type: 'paragraph', text: para });
    }
  }
}

// ============================================================
// 图片获取函数（支持本地和远程）
// ============================================================

/**
 * 获取帖子封面图
 */
export function getPostCoverImage(post: Post): ImageSource {
  if (post.coverImageUrl) {
    return { uri: post.coverImageUrl };
  }
  const localCover = getCoverImage(post.uid);
  if (localCover) {
    return localCover;
  }
  return {
    uri: `https://via.placeholder.com/400x500/4f46e5/ffffff?text=${encodeURIComponent(post.title.slice(0, 10))}`,
  };
}

/**
 * 获取帖子内嵌图片
 */
export function getBlockImage(post: Post, block: ContentBlock): ImageSource | undefined {
  if (block.imageUrl) {
    return { uri: block.imageUrl };
  }
  
  if (block.ref && post.inlineImages) {
    const url = post.inlineImages.get(block.ref);
    if (url) {
      return { uri: url };
    }
  }
  
  if (block.ref) {
    return getInlineImage(post.uid, block.ref);
  }
  
  return undefined;
}

// ============================================================
// 本地数据 API
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
