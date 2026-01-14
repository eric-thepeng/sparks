/**
 * 数据层入口 - 统一管理所有数据获取
 * 
 * 架构说明（对比 Unity）：
 * ┌─────────────────────────────────────────────────────────┐
 * │  index.ts (这个文件)                                     │
 * │  ↓ 类似 Unity 的 ResourceManager / DataManager          │
 * │  ↓ 对外暴露统一的 API，隐藏内部实现细节                    │
 * ├─────────────────────────────────────────────────────────┤
 * │  当前：从本地 JSON + require() 加载                       │
 * │  将来：改成从 API 获取，外部调用代码不需要改               │
 * └─────────────────────────────────────────────────────────┘
 */

import { ImageSource } from 'expo-image';
import postsData from './postsData.json';
import { POST_IMAGES, getCoverImage, getInlineImage } from './imageMap';

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
}

export interface FeedItem {
  uid: string;
  title: string;
  topic: string;
  coverImage: ImageSource;
  // 以下是模拟的社交数据
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

// ============================================================
// 公开 API (类似 Unity 的 public static 方法)
// ============================================================

/**
 * 获取 Feed 列表数据
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
 * 根据 UID 获取完整帖子数据
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
// 将来接入后端时，只需要修改这个文件的内部实现
// 外部调用的 getFeedItems(), getPost() 等接口保持不变
// ============================================================

