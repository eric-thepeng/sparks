/**
 * API 类型定义
 * 匹配后端 API 返回的数据结构
 * 
 * 格式说明：
 * - cover_image: 直接是 URL 字符串（或 "prompt:xxx" 格式）
 * - pages: 字符串数组，每个元素是一页的 Markdown 内容
 * - 不再有 content 字段
 */

// ============================================================
// 帖子类型（pages 为 Markdown 字符串数组）
// ============================================================

/**
 * API Post 格式
 * cover_image 是直接的 URL 字符串
 * pages 是 Markdown 字符串数组
 */
export interface ApiPost {
  uid?: string;
  platform_post_id?: string;  // 唯一标识符
  title: string;
  headline?: string;          // 同 title
  topic?: string;
  bucket_key?: string;        // 分类标识
  cover_image?: string;       // 封面图 URL，可能为空或 "prompt:xxx" 格式
  pages: string[];            // 每页内容数组，每个元素是 Markdown 字符串
  tags?: string[];            // 标签数组
  // 社交数据
  author?: string;
  like_count?: number;
  collect_count?: number;
  created_at?: string;
  is_liked?: boolean;
}

// Alias for compatibility
export type ApiRichPost = ApiPost;

// ============================================================
// 其他 API 类型
// ============================================================

// 分页响应
export interface ApiPaginatedResponse<T> {
  data: T[];
  total?: number;
  limit?: number;
  offset?: number;
}

// 生成帖子的请求参数
export interface GeneratePostRequest {
  topics: string[];
  limit?: number;
}

// 创建/更新帖子的请求参数
export interface CreatePostRequest {
  platform_post_id: string;
  author: string;
  title: string;
  content: string;
  tags: string[];
  like_count?: number;
  collect_count?: number;
}

// API 错误类型
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// API 请求状态
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

// ============================================================
// Comment Types
// ============================================================

export interface User {
  id: string;          // UUID (Internal database ID)
  email: string;       // User email
  userid: string;      // 8-digit unique numeric ID (Public display ID)
  displayName: string | null;
  photoUrl: string | null;
  bio: string | null;
  timezone: string | null;
  language: string | null;
  interests?: Record<string, InterestLevel>; // User's selected tag interests
}

export interface AuthResponse {
  token: string;       // JWT Access Token
  user: User;
}

export interface Post {
  platform_post_id: string;
  author: string;
  title: string;
  content: string;
  tags: string[];
  like_count: number;
  collect_count: number;
  created_at: string; // ISO Date String
}

export interface UploadResponse {
  url: string; // The public URL of the uploaded file
}

export interface Comment {
  id: string;
  user: {
    displayName: string | null;
    photoUrl: string | null;
  };
  content: string;
  created_at: string;
}

export interface ProfileItem {
  itemId: string;       // ID of the post/item
  itemType: string;     // e.g., "post", "article"
  title: string;        // Display title
  thumbnail: string | null; // URL to image (optional, null if none)
  createdAt: string;    // ISO 8601 Date string (e.g., "2024-01-20T10:00:00Z")
}

export interface PaginatedResponse {
  items: ProfileItem[];
  nextCursor: string | null; // null if no more pages
}

export interface ProfileListResponse extends PaginatedResponse {}

// ============================================================
// Recommendation Signal Types
// ============================================================

/**
 * 用户交互信号类型 - 与后端统一
 * 用于推荐算法追踪用户行为
 */
export enum SignalType {
  CLICK = 'click',                           // 点击帖子
  LIKE = 'like',                             // 点赞
  COMMENT = 'comment',                       // 评论
  SAVE = 'save',                             // 收藏
  READ_TO_SECOND = 'read_to_second',         // 读完第二页
  READ_ALMOST_COMPLETE = 'read_almost_complete', // 读完 3/4 页数
}

/**
 * 发送信号请求参数
 */
export interface SendSignalRequest {
  postId: string;
  signalType: SignalType;
}

/**
 * Bucket 权重记录
 * key: bucket 名称 (如 "design_product_hci")
 * value: 权重值
 */
export type BucketCount = Record<string, number>;

/**
 * 发送信号响应
 */
export interface SignalResponse {
  ok: boolean;
  bucket_count: BucketCount;
  click_count: number;
}

/**
 * 重置推荐状态响应
 */
export interface ResetRecommendationResponse {
  ok: boolean;
  message: string;
  bucket_count: BucketCount;
  click_count: number;
}
