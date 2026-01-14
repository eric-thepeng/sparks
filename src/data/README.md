# 📊 数据层架构说明

> 给 Unity 开发者的 React Native 数据加载指南

## 🎮 概念对照表

| Unity 概念 | React Native 对应 | 本项目位置 |
|-----------|------------------|-----------|
| `Resources/` | `assets/` | `assets/posts/` |
| `Resources.Load<T>()` | `require()` | `imageMap.ts` |
| `ScriptableObject` | JSON 文件 | `postsData.json` |
| `AssetBundle` / CDN | 远程 URL | 将来的后端 API |
| `Addressables` | 本项目的 `index.ts` | `src/data/index.ts` |

---

## 📁 目录结构

```
src/data/
├── index.ts          ← ⭐ 统一入口，对外暴露 API
├── postsData.json    ← 帖子数据 (本地 mock)
├── imageMap.ts       ← 图片映射 (require 预加载)
└── README.md         ← 你正在看的文档

assets/posts/
├── {uid}_cover.png   ← 封面图
└── {uid}_img_*.png   ← 内容插图
```

---

## 🚀 快速开始

### 使用数据

```typescript
// 只需要从 index.ts 导入
import { 
  getFeedItems,    // 获取信息流列表
  getPost,         // 获取单个帖子详情
  getPostCover,    // 获取封面图
  getPostImage,    // 获取内容插图
} from './src/data';

// 示例
const feed = getFeedItems();           // 返回 FeedItem[]
const post = getPost('abc123');        // 返回 Post | undefined
const cover = getPostCover('abc123');  // 返回 ImageSource | undefined
const img = getPostImage('abc123', 'img_1');
```

### 添加新图片

1. 把图片放到 `assets/posts/`，命名格式：
   - 封面：`{uid}_cover.png`
   - 插图：`{uid}_img_1.png`, `{uid}_img_2.png`, ...

2. 运行脚本重新生成映射：
   ```bash
   node scripts/generate-image-map.js
   ```

3. 更新 `postsData.json` 添加对应的帖子数据

---

## 🔄 切换到后端服务器

当你准备接入真实后端时，只需要修改 `index.ts`，**外部调用代码不需要任何改动**。

### 步骤 1：创建 API 服务

```typescript
// src/services/api.ts
const API_BASE = 'https://your-api.com/v1';

export async function fetchFeedItems(): Promise<FeedItem[]> {
  const res = await fetch(`${API_BASE}/feed`);
  return res.json();
}

export async function fetchPost(uid: string): Promise<Post> {
  const res = await fetch(`${API_BASE}/posts/${uid}`);
  return res.json();
}
```

### 步骤 2：修改 index.ts

```typescript
// src/data/index.ts

// ❌ 删除本地数据导入
// import postsData from './postsData.json';
// import { POST_IMAGES, getCoverImage, getInlineImage } from './imageMap';

// ✅ 改用 API
import { fetchFeedItems, fetchPost } from '../services/api';

// 类型定义保持不变
export interface Post { ... }
export interface FeedItem { ... }

// 修改为异步函数
export async function getFeedItems(): Promise<FeedItem[]> {
  return await fetchFeedItems();
}

export async function getPost(uid: string): Promise<Post | undefined> {
  return await fetchPost(uid);
}

// 图片改用远程 URL
export function getPostCover(uid: string): string {
  return `https://cdn.your-api.com/posts/${uid}/cover.png`;
}

export function getPostImage(uid: string, ref: string): string {
  return `https://cdn.your-api.com/posts/${uid}/${ref}.png`;
}
```

### 步骤 3：更新组件（如果需要）

如果改成异步加载，组件需要用 `useEffect` + `useState`：

```typescript
// 之前（同步）
const feed = getFeedItems();

// 之后（异步）
const [feed, setFeed] = useState<FeedItem[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  getFeedItems().then(data => {
    setFeed(data);
    setLoading(false);
  });
}, []);
```

### 图片组件自动支持远程 URL

`expo-image` 的 `Image` 组件同时支持本地资源和远程 URL：

```typescript
// 本地资源 (现在)
<Image source={require('./image.png')} />

// 远程 URL (将来)
<Image source={{ uri: 'https://cdn.example.com/image.png' }} />

// 两者都能用 source={...} 传入，组件会自动识别
```

---

## 📦 后端 API 建议格式

### GET /api/feed
```json
{
  "items": [
    {
      "uid": "abc123",
      "title": "帖子标题",
      "topic": "话题",
      "cover_url": "https://cdn.example.com/posts/abc123/cover.png",
      "likes": 234,
      "comments": 42,
      "user": {
        "id": "u1",
        "name": "用户名",
        "avatar": "https://cdn.example.com/avatars/u1.png"
      }
    }
  ],
  "next_cursor": "..."
}
```

### GET /api/posts/:uid
```json
{
  "uid": "abc123",
  "title": "帖子标题",
  "topic": "话题",
  "pages": [
    {
      "index": 1,
      "blocks": [
        { "type": "h1", "text": "标题" },
        { "type": "paragraph", "text": "段落内容" },
        { "type": "image", "url": "https://cdn.example.com/posts/abc123/img_1.png" }
      ]
    }
  ]
}
```

---

## ⚠️ React Native 限制说明

### 为什么需要 imageMap.ts？

React Native 的打包工具 Metro 在**编译时**就需要知道所有 `require()` 的路径。

```javascript
// ❌ 不支持动态路径
const image = require(`./assets/${dynamicPath}.png`);

// ✅ 必须是静态路径
const image = require('./assets/abc123_cover.png');
```

这类似于 Unity 的 `Resources.Load()` —— 你不能传入运行时才知道的路径。

解决方案就是预先映射所有图片，这就是 `imageMap.ts` 的作用。

### 切换到后端后就不需要了

当图片改成从 CDN URL 加载时，就不再需要 `imageMap.ts` 了：

```typescript
// 直接用 URL
<Image source={{ uri: `https://cdn.example.com/${uid}/cover.png` }} />
```

---

## 🛠️ 开发脚本

```bash
# 重新生成图片映射
node scripts/generate-image-map.js

# 启动开发服务器
npx expo start --clear
```

---

## 💡 最佳实践

1. **所有数据访问都通过 `src/data/index.ts`** —— 保持单一入口
2. **添加新图片后记得运行脚本** —— 否则图片加载不出来
3. **保持 `postsData.json` 和图片同步** —— 数据里引用的图片必须存在
4. **将来迁移时先写好 API，再改 index.ts** —— 一次只改一个地方

