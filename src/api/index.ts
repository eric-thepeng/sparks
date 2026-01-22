/**
 * API 客户端
 * 封装所有后端 API 请求
 */

import { 
  ApiPost, 
  ApiRichPost,
  GeneratePostRequest, 
  ApiError,
  LoginRequest,
  SignupRequest,
  AuthResponse,
  User,
  UpdateUserRequest,
  GoogleLoginRequest,
  Comment,
  CreateCommentRequest,
  ProfileListResponse,
  ProfileItem
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
      ...options.headers,
    };

    // Only set JSON content type if body exists and is not FormData
    if (options.body && !(options.body instanceof FormData)) {
      // @ts-ignore
      headers['Content-Type'] = 'application/json';
    }

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
        
        // Handle Pydantic/FastAPI validation errors (array of details)
        if (errorData && Array.isArray(errorData.detail)) {
          // Extract 'msg' from each error detail and join them
          errorMessage = errorData.detail
            .map((err: any) => err.msg || JSON.stringify(err))
            .join('\n');
        } 
        // Handle standard message format
        else if (errorData && errorData.message) {
          errorMessage = errorData.message;
        }
        // Handle detail as string
        else if (errorData && errorData.detail && typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
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

    // For 204 No Content
    if (response.status === 204) {
      return {} as T;
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

export async function uploadImage(uri: string): Promise<string> {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'photo.jpg';
  
  // Infer type from extension
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  // @ts-ignore - React Native FormData expects an object for file
  formData.append('file', {
    uri,
    name: filename,
    type,
  });

  const response = await request<{ url: string }>('/upload', {
    method: 'POST',
    body: formData,
  });
  
  return response.url;
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
export async function fetchPosts(limit: number = 1000): Promise<ApiPost[]> {
  return request<ApiPost[]>(`/posts?limit=${limit}`);
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
export async function createPost(post: any): Promise<ApiRichPost> {
  return request<ApiRichPost>('/posts', {
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
// Comment API
// ============================================================

export async function fetchComments(postId: string): Promise<Comment[]> {
  return request<Comment[]>(`/posts/${postId}/comments`);
}

export async function createComment(postId: string, data: CreateCommentRequest): Promise<Comment> {
  return request<Comment>(`/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
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

// ============================================================
// Profile Collections API (History, Likes)
// ============================================================

export async function getMyLikes(limit: number = 20, cursor?: string): Promise<ProfileListResponse> {
  const query = `limit=${limit}` + (cursor ? `&cursor=${cursor}` : '');
  return request<ProfileListResponse>(`/me/likes?${query}`);
}

export async function likeItem(itemId: string, itemType: string = 'post'): Promise<void> {
  const query = `itemId=${encodeURIComponent(itemId)}&itemType=${encodeURIComponent(itemType)}`;
  return request<void>(`/me/likes?${query}`, {
    method: 'POST',
    body: JSON.stringify({ itemId, itemType })
  });
}

export async function unlikeItem(itemId: string, itemType: string = 'post'): Promise<void> {
  const query = `itemId=${encodeURIComponent(itemId)}&itemType=${encodeURIComponent(itemType)}`;
  return request<void>(`/me/likes?${query}`, {
    method: 'DELETE',
    body: JSON.stringify({ itemId, itemType })
  });
}

export async function getMyHistory(limit: number = 20, cursor?: string): Promise<ProfileListResponse> {
  const query = `limit=${limit}` + (cursor ? `&cursor=${encodeURIComponent(cursor)}` : '');
  return request<ProfileListResponse>(`/me/history?${query}`);
}

export async function recordHistory(itemId: string, itemType: string = 'post'): Promise<void> {
  const query = `itemId=${encodeURIComponent(itemId)}&itemType=${encodeURIComponent(itemType)}`;
  return request<void>(`/me/history?${query}`, {
    method: 'POST',
    body: JSON.stringify({ itemId, itemType })
  });
}

export async function clearHistory(): Promise<void> {
  return request<void>('/me/history/clear', {
    method: 'DELETE'
  });
}

// Backward compatibility or alias if needed, but updated to use new functions in ProfileScreen
// export const fetchHistory = getMyHistory; 
// export const fetchLikedPosts = getMyLikes;

// 导出类型
export * from './types';
