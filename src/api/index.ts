/**
 * API 客户端
 * 封装所有后端 API 请求
 */

import { 
  ApiPost, 
  ApiSimplePost,
  ApiRichPost,
  GeneratePostRequest, 
  CreatePostRequest,
  ApiError,
  LoginRequest,
  SignupRequest,
  AuthResponse,
  User,
  UpdateUserRequest,
  GoogleLoginRequest
} from './types';
import { config } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API 基础地址
const API_BASE_URL = config.apiBaseUrl;
const API_PREFIX = config.apiPrefix;

// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = 15000;

// 获取 Token 辅助函数
const getToken = async (): Promise<string | null> => {
  try {
    const jsonValue = await AsyncStorage.getItem(config.authStorageKey);
    return jsonValue != null ? JSON.parse(jsonValue).token : null;
  } catch (e) {
    return null;
  }
};

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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // 自动添加 Token
    const token = await getToken();
    if (token) {
      // @ts-ignore
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE_URL}${API_PREFIX}${endpoint}`;
    console.log(`[API] Fetching: ${url}`);
    if (options.body) {
      console.log(`[API] Body:`, options.body);
    }
    console.log(`[API] Headers:`, JSON.stringify(headers));
    
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers,
    }).catch(e => {
       console.error(`[API] Network Fail: ${url}`, e);
       throw e;
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = `HTTP error: ${response.status}`;
      try {
        const errorText = await response.text();
        console.log(`[API] Error Response: ${errorText}`);
        const errorData = JSON.parse(errorText);
        if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // ignore json parse error
      }

      const error: ApiError = {
        message: errorMessage,
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

// ============================================================
// Auth API
// ============================================================

export async function login(data: LoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function signup(data: SignupRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getMe(): Promise<User> {
  return request<User>('/me');
}

export async function updateMe(data: UpdateUserRequest): Promise<{ user: User }> {
  return request<{ user: User }>('/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function loginWithGoogle(data: GoogleLoginRequest): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/google', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================
// 帖子列表相关
// ============================================================

/**
 * 获取帖子列表
 * GET /posts
 * 返回的可能是简单帖子或富文本帖子的混合数组
 */
export async function fetchPosts(): Promise<ApiPost[]> {
  // 注意：后端路径可能没有 prefix，这里假设 fetchPosts 使用原始路径，或者也需要 prefix
  // 如果后端完全遵循 API contract，posts 应该在 {BASE}{PREFIX}/posts
  // 之前的代码是 request<ApiPost[]>('/posts')，现在 request 自动加了 PREFIX
  return request<ApiPost[]>('/posts');
}

/**
 * 分页获取帖子
 * GET /api/db/posts?limit=20&offset=0
 * 注意：旧代码硬编码了 /api/db/posts，这里可能需要调整适配新的 PREFIX
 * 如果 PREFIX 是 /api，那么 /api/db/posts 会变成 /api/api/db/posts
 * 我们假设旧的 fetchPostsPaginated 也是标准 API 的一部分
 */
export async function fetchPostsPaginated(
  limit: number = 20,
  offset: number = 0
): Promise<ApiPost[]> {
  // 假设后端路径兼容
  // Note: Backend seems to use /posts for listing, not /db/posts
  return request<ApiPost[]>(`/posts?limit=${limit}&offset=${offset}`);
}

// ============================================================
// 单个帖子相关
// ============================================================

/**
 * 获取单个帖子
 * GET /posts/{id}
 * @param id - platform_post_id 或 uid
 */
export async function fetchPostById(id: string): Promise<ApiPost> {
  return request<ApiPost>(`/posts/${id}`);
}

// ============================================================
// 创建和生成帖子
// ============================================================

/**
 * 创建/更新帖子
 * POST /posts
 */
export async function createPost(post: CreatePostRequest): Promise<ApiSimplePost> {
  return request<ApiSimplePost>('/posts', {
    method: 'POST',
    body: JSON.stringify(post),
  });
}

/**
 * 生成新帖子（AI 生成，包含富文本和图片）
 * POST /generate
 */
export async function generatePost(
  topics: string[],
  limit: number = 1
): Promise<ApiRichPost[]> {
  return request<ApiRichPost[]>('/generate', {
    method: 'POST',
    body: JSON.stringify({ topics, limit } as GeneratePostRequest),
  });
}

// ============================================================
// Saved Posts API
// ============================================================

export async function fetchSavedPostsApi(): Promise<ApiPost[]> {
  // GET /me/saved
  return request<ApiPost[]>('/me/saved');
}

export async function savePostApi(postId: string): Promise<void> {
  // POST /me/saved/{post_id}
  return request<void>(`/me/saved/${postId}`, {
    method: 'POST'
  });
}

export async function unsavePostApi(postId: string): Promise<void> {
  // DELETE /me/saved/{post_id}
  return request<void>(`/me/saved/${postId}`, {
    method: 'DELETE'
  });
}

// 导出类型
export * from './types';
