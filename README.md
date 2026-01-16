# Sparks

Expo + React Native 移动应用 - 小红书风格的信息流阅读 App

## 📁 项目结构

```
sparks/
├── App.tsx                  ← 主应用（UI + 状态管理）
├── index.ts                 ← 入口
├── assets/
│   └── posts/               ← 帖子图片 (55张)
├── src/
│   ├── api/                 ← API 层
│   │   ├── index.ts         ← API 客户端（fetch 封装）
│   │   └── types.ts         ← API 数据类型定义
│   ├── data/                ← 数据层
│   │   ├── index.ts         ← 数据管理 + 转换函数
│   │   ├── imageMap.ts      ← 本地图片映射
│   │   ├── posts.ts         ← 帖子类型定义
│   │   └── postsData.json   ← 本地帖子数据（离线回退）
│   └── hooks/               ← React Hooks
│       ├── index.ts         ← Hooks 入口
│       └── usePosts.ts      ← 数据获取 Hooks
└── scripts/
    ├── generate-image-map.js  ← 图片映射生成
    └── convert-posts.js       ← JSONL 转 TypeScript
```

## 🏗️ 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│  App.tsx (UI 层)                                            │
│  └── useFeedItems() / usePost()                             │
├─────────────────────────────────────────────────────────────┤
│  src/hooks/usePosts.ts (状态管理层)                          │
│  └── 管理 loading/error/success 状态                         │
│  └── 调用 API，返回转换后的数据                               │
├─────────────────────────────────────────────────────────────┤
│  src/api/index.ts (网络层)                                   │
│  └── fetch 请求后端 API                                      │
│  └── 统一错误处理和超时控制                                    │
├─────────────────────────────────────────────────────────────┤
│  src/data/index.ts (数据层)                                  │
│  └── 数据转换：ApiPost → FeedItem / Post                     │
│  └── 本地数据回退支持                                         │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 清缓存启动
npm run start:clear
```

## 🔌 后端 API

### API 地址
```
https://spark-api-nvy6vvhfoa-ue.a.run.app
```

### 可用接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/posts` | 获取帖子列表 |
| GET | `/posts/{id}` | 获取单个帖子（id = platform_post_id） |
| GET | `/api/db/posts?limit=20&offset=0` | 分页获取帖子 |
| POST | `/generate` | 生成新帖子 |

### 数据结构

**API 返回格式（ApiPost）：**
```typescript
{
  platform_post_id: string;  // 帖子唯一ID，如 "spark_6720"
  author: string;            // 作者，如 "User_1Cu8D"
  title: string;             // 标题
  content: string;           // 内容文本
  tags: string[];            // 标签，如 ["Tech", "Random"]
  like_count: number;        // 点赞数
  collect_count: number;     // 收藏数
  created_at: string;        // 创建时间 ISO8601
}
```

**App 内部格式（FeedItem / Post）：**
```typescript
// FeedItem - 用于信息流卡片
interface FeedItem {
  uid: string;
  title: string;
  topic: string;
  coverImage: ImageSource;
  likes: number;
  isLiked: boolean;
  comments: number;
  user: { id, name, avatar };
}

// Post - 用于帖子详情页
interface Post {
  uid: string;
  title: string;
  topic: string;
  pages: PostPage[];  // 分页内容
  author?: string;
  likeCount?: number;
  collectCount?: number;
}
```

## 🎣 Hooks 使用

### useFeedItems
获取信息流列表：
```typescript
const { 
  feedItems,  // FeedItem[]
  status,     // 'idle' | 'loading' | 'success' | 'error'
  error,      // string | null
  refetch     // () => void
} = useFeedItems();
```

### usePaginatedFeed
分页获取（支持无限滚动）：
```typescript
const { 
  feedItems,
  status,
  error,
  hasMore,   // boolean - 是否有更多数据
  loadMore,  // () => void - 加载下一页
  refetch    // () => void - 重新加载
} = usePaginatedFeed(20);
```

### usePost
获取单个帖子详情：
```typescript
const { 
  post,      // Post | null
  status,
  error,
  refetch
} = usePost(postId);
```

## 📊 数据生成

### 从 JSONL 生成帖子数据

```bash
# 转换 JSONL 为 TypeScript（自动处理中文引号）
npm run convert:posts -- ~/Downloads/posts.jsonl
```

### 生成图片映射

```bash
# 把图片放到 assets/posts/ 后运行
npm run gen:images
```

## ⚠️ 注意事项

1. **中文引号问题**：在 TypeScript/JavaScript 字符串中，中文引号 `""` 会导致语法错误。使用 `convert:posts` 脚本会自动处理。

2. **本地图片加载**：React Native 不支持动态 `require()`，需要使用 `gen:images` 预先映射所有图片。

3. **数据转换**：API 返回的 `content` 是纯文本，会在 `apiPostToPost()` 中自动解析为 `pages/blocks` 结构。

4. **离线回退**：如果 API 请求失败，可以使用 `getFeedItems()` / `getPost()` 获取本地数据。

## 🔧 扩展开发

### 添加新的 API 接口

1. 在 `src/api/types.ts` 添加类型定义
2. 在 `src/api/index.ts` 添加请求函数
3. 在 `src/hooks/usePosts.ts` 添加对应的 Hook
4. 如需数据转换，在 `src/data/index.ts` 添加转换函数

### 修改 API 地址

编辑 `src/api/index.ts`：
```typescript
const API_BASE_URL = 'https://your-api-url.com';
```
