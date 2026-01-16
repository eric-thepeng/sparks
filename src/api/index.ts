/**
 * API 客户端
 * 封装所有后端 API 请求
 */

import { ApiPost, GeneratePostRequest, ApiError } from './types';

// API 基础地址
const API_BASE_URL = 'https://spark-api-nvy6vvhfoa-ue.a.run.app';

// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = 10000;

/**
 * 通用请求函数
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error: ApiError = {
        message: `HTTP error: ${response.status}`,
        status: response.status,
      };
      throw error;
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw { message: '请求超时', code: 'TIMEOUT' } as ApiError;
    }
    
    throw error;
  }
}

/**
 * 获取帖子列表
 * GET /posts
 */
export async function fetchPosts(): Promise<ApiPost[]> {
  return request<ApiPost[]>('/posts');
}

/**
 * 获取单个帖子
 * GET /posts/{id}
 * @param id - platform_post_id
 */
export async function fetchPostById(id: string): Promise<ApiPost> {
  return request<ApiPost>(`/posts/${id}`);
}

/**
 * 分页获取帖子
 * GET /api/db/posts?limit=20&offset=0
 */
export async function fetchPostsPaginated(
  limit: number = 20,
  offset: number = 0
): Promise<ApiPost[]> {
  return request<ApiPost[]>(`/api/db/posts?limit=${limit}&offset=${offset}`);
}

/**
 * 生成新帖子
 * POST /generate
 */
export async function generatePost(
  topics: string[],
  limit: number = 1
): Promise<ApiPost[]> {
  return request<ApiPost[]>('/generate', {
    method: 'POST',
    body: JSON.stringify({ topics, limit } as GeneratePostRequest),
  });
}

// 导出类型
export * from './types';

