/**
 * API 类型定义
 * 匹配后端 API 返回的数据结构
 */

// 后端返回的帖子数据结构
export interface ApiPost {
  platform_post_id: string;
  author: string;
  title: string;
  content: string;
  tags: string[];
  like_count: number;
  collect_count: number;
  created_at: string;
}

// 分页响应（可能的格式）
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

// API 错误类型
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

// API 请求状态
export type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

