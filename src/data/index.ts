/**
 * 数据层入口 - 统一管理所有数据获取
 * 
 * 架构说明：
 * ┌─────────────────────────────────────────────────────────────┐
 * │  index.ts (这个文件)                                         │
 * │  ↓ 数据转换层 - 将 API 数据转换为 App 内部格式                  │
 * │  ↓ API 格式：                                                │
 * │    - pages: Markdown 字符串数组                              │
 * │    - cover_image: 直接 URL 字符串                            │
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
  caption?: string;   // 图片说明
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
// 辅助函数
// ============================================================

/**
 * 获取封面图 URL
 * cover_image 是直接的 URL 字符串
 * 返回 null 如果是 prompt: 前缀或不存在
 */
function getCoverImageUrl(post: any): string | null {
  if (!post.cover_image) return null;
  if (typeof post.cover_image !== 'string') return null;
  
  // 检查是否是 prompt: 前缀
  if (post.cover_image.startsWith('prompt:')) {
    return null; // prompt 格式不是有效的图片 URL
  }
  return post.cover_image;
}

// ============================================================
// API 数据转换函数
// ============================================================

/**
 * 将 API 返回的帖子转换为 FeedItem（用于信息流）
 */
export function apiPostToFeedItem(apiPost: ApiPost, index: number): FeedItem {
  const post = apiPost as any;
  const postUid = post.uid || post.platform_post_id || `unknown-${index}`;
  const title = post.title || post.headline || 'Untitled';
  
  let coverImage: ImageSource;
  const coverUrl = getCoverImageUrl(post);
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
    topic: post.topic || post.bucket_key || tags[0] || 'General',
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
  const postUid = post.uid || post.platform_post_id || 'unknown';
  const title = post.title || post.headline || 'Untitled';
  const tags = post.tags || [];
  
  // 获取封面图 URL
  const coverUrl = getCoverImageUrl(post);
  
  // 解析每个页面的 Markdown 字符串为 blocks
  const pages: PostPage[] = (post.pages || [])
    .map((pageMarkdown: string, idx: number) => {
      const pageBlocks: ContentBlock[] = [];
      
      // 第一页自动添加标题
      if (idx === 0) {
        pageBlocks.push({ type: 'h1', text: title });
      }
      
      // 解析 Markdown 内容为 blocks
      const paragraphs = pageMarkdown.split(/\n\n+/).filter((p: string) => p.trim());
      paragraphs.forEach((para: string) => {
        parseAndAddBlocks(para, pageBlocks);
      });
      
      return {
        index: idx + 1,
        blocks: pageBlocks,
      };
    })
    .filter((page: PostPage) => page.blocks.length > 0);

  
  // 统计图片数量
  let imageCount = 0;
  pages.forEach(page => {
    page.blocks.forEach(block => {
      if (block.type === 'image') imageCount++;
    });
  });

  return {
    uid: postUid,
    title,
    topic: post.topic || post.bucket_key || tags[0] || 'General',
    pages,
    coverImageUrl: coverUrl || undefined,
    author: post.author,
    likeCount: post.like_count,
    collectCount: post.collect_count,
    createdAt: post.created_at,
    isLiked: !!post.is_liked,
  };
}

/**
 * Normalize text by merging soft-wrapped lines without breaking words.
 */
function normalizeSoftWrappedText(text: string): string {
  const normalized = sanitizeText(text)
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u2028\u2029]/g, '\n');
  // Merge word breaks introduced by soft line wraps
  const mergedWords = normalized.replace(/([A-Za-z0-9])\n([A-Za-z0-9])/g, '$1$2');
  // Replace remaining newlines with spaces
  const withSpaces = mergedWords.replace(/\n+/g, ' ');
  return withSpaces.replace(/\s+/g, ' ').trim();
}

/**
 * Remove invisible/control characters that can break word rendering.
 */
function sanitizeText(text: string): string {
  return text
    // Soft hyphen + zero-width characters
    .replace(/[\u00AD\u200B\u200C\u200D\u2060\uFEFF]/g, '')
    // Remove control characters except line breaks/tabs (handled later)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

// ============================================================
// Markdown 解析函数
// ============================================================

/**
 * 解析单个段落并添加到 blocks 数组
 * 增强版：支持多种 Markdown 元素
 */
function parseAndAddBlocks(para: string, pageBlocks: ContentBlock[]): void {
  const trimmed = para.trim();
  if (!trimmed) return;

  // Handle cases where title, subtitle, and text are in the same block separated by single newlines
  if (trimmed.includes('\n')) {
    const lines = trimmed.split('\n');
    let hasHeader = false;
    for (const line of lines) {
      if (line.trim().startsWith('#')) {
        hasHeader = true;
        break;
      }
    }

    if (hasHeader) {
      lines.forEach(line => {
        if (line.trim()) {
          parseAndAddBlocks(line.trim(), pageBlocks);
        }
      });
      return;
    }
  }

  // 1. Headers (##, ###)
  if (trimmed.startsWith('###')) {
    pageBlocks.push({ type: 'h3', text: sanitizeText(trimmed.replace(/^###\s*/, '')) });
    return;
  } else if (trimmed.startsWith('##')) {
    pageBlocks.push({ type: 'h2', text: sanitizeText(trimmed.replace(/^##\s*/, '')) });
    return;
  } else if (trimmed.startsWith('#')) {
    pageBlocks.push({ type: 'h1', text: sanitizeText(trimmed.replace(/^#\s*/, '')) });
    return;
  }

  // 2. Blockquotes (> quote)
  if (trimmed.startsWith('>')) {
    pageBlocks.push({ 
      type: 'quote', 
      text: sanitizeText(trimmed.replace(/^>\s*/, '').replace(/\n>\s*/g, '\n').trim()) 
    });
    return;
  }

  // 3. Lists (- item, * item, 1. item)
  if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
    const items = trimmed.split(/\n/).map(line => line.replace(/^[-*]\s*|^\d+\.\s*/, '').trim());
    pageBlocks.push({ type: 'bullets', items });
    return;
  }

  // 3.5. Handle image lines inside mixed text blocks
  if (trimmed.includes('\n')) {
    const lines = trimmed.split('\n');
    const imageLineRegex = /^\s*!\[([^\]]*)\]\(([^)]+)\)\s*$/;
    const captionLineRegex = /^\s*\*([^*]+)\*\s*$/;
    const hasImageLine = lines.some(line => imageLineRegex.test(line));

    if (hasImageLine) {
      const buffer: string[] = [];
      for (let i = 0; i < lines.length; i += 1) {
        const line = lines[i].trim();
        const imageLineMatch = line.match(imageLineRegex);

        if (imageLineMatch) {
          const bufferedText = buffer.join(' ').trim();
          if (bufferedText) {
            addParagraphBlocks(normalizeSoftWrappedText(bufferedText), pageBlocks);
          }
          buffer.length = 0;

          let caption: string | undefined;
          const nextLine = lines[i + 1]?.trim() || '';
          const captionMatch = nextLine.match(captionLineRegex);
          if (captionMatch) {
            caption = `*${captionMatch[1].trim()}*`;
            i += 1;
          }

          pageBlocks.push({
            type: 'image',
            imageUrl: imageLineMatch[2],
            text: imageLineMatch[1],
            caption,
          });
          continue;
        }

        if (line.length > 0) {
          buffer.push(line);
        }
      }

      const remainingText = buffer.join(' ').trim();
      if (remainingText) {
        addParagraphBlocks(normalizeSoftWrappedText(remainingText), pageBlocks);
      }
      return;
    }
  }

  // 4. Images and Captions
  // Regex to match image and optional caption (italicized with *...*)
  // Supports both ![alt](url)*caption* and ![alt](url)\n*caption*
  // Only matches if the caption is at the end of the string
  const imageWithCaptionRegex = /!\[([^\]]*)\]\(([^)]+)\)(?:\s*\*([^*]+)\*[\s\n]*)$/;
  const imageMatch = trimmed.match(imageWithCaptionRegex);
  
  if (imageMatch && trimmed === imageMatch[0]) {
    pageBlocks.push({ 
      type: 'image', 
      imageUrl: imageMatch[2],
      text: imageMatch[1],
      caption: imageMatch[3] ? `*${imageMatch[3].trim()}*` : undefined
    });
    return;
  }

  // 5. Mixed Content or Paragraphs
  // 检查内嵌图片
  const inlineImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match;
  let hasInlineElements = false;
  
  while ((match = inlineImageRegex.exec(trimmed)) !== null) {
    hasInlineElements = true;
    const textBefore = trimmed.slice(lastIndex, match.index).trim();
    if (textBefore) {
      addParagraphBlocks(normalizeSoftWrappedText(textBefore), pageBlocks);
    }
    
    // Check if there's a caption right after this inline image
    // Only capture as caption if it's at the end of the paragraph or followed by a newline
    const rest = trimmed.slice(match.index + match[0].length);
    const captionMatch = rest.match(/^\s*\*([^*]+)\*(?:\s|$)/);
    
    pageBlocks.push({
      type: 'image',
      imageUrl: match[2],
      text: match[1],
      caption: captionMatch ? `*${captionMatch[1].trim()}*` : undefined
    });
    
    lastIndex = match.index + match[0].length + (captionMatch ? captionMatch[0].length : 0);
    
    // Crucial: sync the global regex's lastIndex with our manual lastIndex
    inlineImageRegex.lastIndex = lastIndex;
  }
  
  if (hasInlineElements) {
    const textAfter = trimmed.slice(lastIndex).trim();
    if (textAfter) {
      addParagraphBlocks(normalizeSoftWrappedText(textAfter), pageBlocks);
    }
  } else {
    // 兼容旧版的 【...】 标题
    if (trimmed.match(/^【.+】/)) {
      pageBlocks.push({ type: 'h2', text: trimmed });
    } else {
      // 增强：检查此段落是否是前一个图片的说明 (格式为 *...*)
      const lastBlock = pageBlocks[pageBlocks.length - 1];
      if (lastBlock && lastBlock.type === 'image' && !lastBlock.caption && trimmed.startsWith('*') && trimmed.endsWith('*')) {
        lastBlock.caption = trimmed;
        return;
      }
      addParagraphBlocks(normalizeSoftWrappedText(trimmed), pageBlocks);
    }
  }
}

/**
 * 辅助函数：将内容切分为多个 block，确保每个 block 不会太长触发渲染截断
 */
function addParagraphBlocks(text: string, pageBlocks: ContentBlock[]): void {
  pageBlocks.push({ type: 'paragraph', text });
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

// Bucket 数据
export * from './buckets';
