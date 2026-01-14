# Sparks

Expo + React Native 移动应用

## 📁 项目结构

```
sparks/
├── App.tsx              ← 主应用
├── index.ts             ← 入口
├── assets/
│   └── posts/           ← 帖子图片 (55张)
├── src/
│   └── data/
│       └── posts.ts     ← 帖子数据
└── scripts/
    ├── generate-image-map.js  ← 图片映射生成
    └── convert-posts.js       ← JSONL 转 TypeScript
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

## 📊 数据生成

### 从 JSONL 生成帖子数据

```bash
# 转换 JSONL 为 TypeScript（自动处理中文引号）
npm run convert:posts -- ~/Downloads/posts.jsonl
```

脚本会自动：
- 读取 JSONL 文件
- 转换中文引号 `""` 为英文
- 生成 `src/data/posts.ts`

### 生成图片映射

```bash
# 把图片放到 assets/posts/ 后运行
npm run gen:images
```

## ⚠️ 注意事项

1. **中文引号问题**：在 TypeScript/JavaScript 字符串中，中文引号 `""` 会导致语法错误。使用 `convert:posts` 脚本会自动处理。

2. **本地图片加载**：React Native 不支持动态 `require()`，需要使用 `gen:images` 预先映射。

3. **远程图片**：当前使用 `https://picsum.photos` 占位图。接入后端后改用真实 URL。

## 🔄 接入后端

修改 `src/data/posts.ts`：

```typescript
// 现在：硬编码数据
export const POSTS = [...];

// 将来：从 API 获取
export async function fetchPosts() {
  const res = await fetch('https://api.example.com/posts');
  return res.json();
}
```
