/**
 * API 类型定义
 * 匹配后端 API 返回的数据结构
 * 
 * 所有帖子都是 RichPost 格式，包含 pages/blocks 结构
 */

// ============================================================
// 帖子类型（RichPost - 包含图片和分页内容）
// ============================================================

export interface ApiImage {
  id?: string;              // 内嵌图片 ID，如 "img_1"
  url: string;              // 图片 URL
  prompt?: string;          // 图片描述
  file_name?: string;       // 文件名
  placement_hint?: string;  // 放置提示
}

export interface ApiBlock {
  type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'image' | 'spacer' | 'bullets' | 'quote';
  text?: string;           // 标题、段落、引用的文本
  ref?: string;            // 图片引用，对应 inline_images 的 id
  items?: string[];        // bullets 列表项
  size?: 'sm' | 'md' | 'lg'; // spacer 大小
}

export interface ApiPage {
  index: number;            // 页码 (1-based)
  target_words?: number;    // 目标字数
  actual_words?: number;    // 实际字数
  blocks: ApiBlock[];
}

export interface ApiRichPost {
  uid: string;
  title: string;
  headline?: string;        // 同 title
  topic?: string;
  bucket_key?: string;      // 分类标识
  total_pages?: number;     // 总页数
  cover_image?: ApiImage;
  inline_images?: ApiImage[];
  pages: ApiPage[];
  // 可选的社交数据
  author?: string;
  like_count?: number;
  collect_count?: number;
  created_at?: string;
  is_liked?: boolean;
}

// ============================================================
// 帖子类型 - 所有帖子都是 RichPost 格式
// ============================================================

export type ApiPost = ApiRichPost;

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
