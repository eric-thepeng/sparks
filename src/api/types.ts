/**
 * API 类型定义
 * 匹配后端 API 返回的数据结构
 */

// ============================================================
// 简单帖子（POST /posts 创建的）
// ============================================================

export interface ApiSimplePost {
  platform_post_id: string;
  author: string;
  title: string;
  content: string;
  tags: string[];
  like_count: number;
  collect_count: number;
  created_at: string;
}

// ============================================================
// 富文本帖子（AI 生成的，包含图片和分页内容）
// ============================================================

export interface ApiImage {
  id?: string;      // 内嵌图片 ID，如 "img_1"
  url: string;      // 图片 URL
}

export interface ApiBlock {
  type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'image' | 'spacer' | 'bullets' | 'quote';
  text?: string;           // 标题、段落、引用的文本
  ref?: string;            // 图片引用，对应 inline_images 的 id
  items?: string[];        // bullets 列表项
  size?: 'sm' | 'md' | 'lg'; // spacer 大小
}

export interface ApiPage {
  index: number;
  blocks: ApiBlock[];
}

export interface ApiRichPost {
  uid: string;
  title: string;
  topic: string;
  cover_image?: ApiImage;
  inline_images?: ApiImage[];
  pages: ApiPage[];
  // 可选的社交数据
  author?: string;
  like_count?: number;
  collect_count?: number;
  created_at?: string;
}

// ============================================================
// 联合类型 - 后端可能返回两种格式
// ============================================================

export type ApiPost = ApiSimplePost | ApiRichPost;

/**
 * 类型守卫：判断是否是富文本帖子
 */
export function isRichPost(post: ApiPost): post is ApiRichPost {
  return 'uid' in post && 'pages' in post;
}

/**
 * 类型守卫：判断是否是简单帖子
 */
export function isSimplePost(post: ApiPost): post is ApiSimplePost {
  return 'platform_post_id' in post && 'content' in post;
}

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
