#!/usr/bin/env node
/**
 * 将 JSONL 数据转换为 TypeScript
 * 
 * 用法：
 *   node scripts/convert-posts.js input.jsonl
 * 
 * 自动处理：
 *   - 中文引号 "" → 英文引号 ""（或移除）
 *   - 中文书名号 《》 → 保留（它们在字符串中是安全的）
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_FILE = path.join(__dirname, '../src/data/posts.ts');

// 清理文本中的特殊字符
function cleanText(text) {
  if (!text) return text;
  return text
    // 中文引号转英文或移除
    .replace(/"/g, '"')
    .replace(/"/g, '"')
    .replace(/'/g, "'")
    .replace(/'/g, "'")
    // 转义双引号（因为我们用双引号包裹字符串）
    .replace(/"/g, '\\"');
}

// 递归清理对象中的所有字符串
function cleanObject(obj) {
  if (typeof obj === 'string') {
    return cleanText(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }
  if (typeof obj === 'object' && obj !== null) {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanObject(value);
    }
    return cleaned;
  }
  return obj;
}

function convertPosts(inputFile) {
  // 读取 JSONL
  const content = fs.readFileSync(inputFile, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.trim());
  
  const posts = lines.map(line => {
    const post = JSON.parse(line);
    return cleanObject(post);
  });

  // 生成 TypeScript
  let output = `/**
 * 帖子数据 - 自动生成
 * 
 * 生成命令：node scripts/convert-posts.js <input.jsonl>
 * 生成时间：${new Date().toISOString()}
 */

export interface ContentBlock {
  type: 'h1' | 'h2' | 'paragraph' | 'image' | 'spacer';
  text?: string;
  ref?: string;
}

export interface PostPage {
  index: number;
  blocks: ContentBlock[];
}

export interface Post {
  uid: string;
  title: string;
  topic: string;
  pages: PostPage[];
}

export interface FeedItem {
  uid: string;
  title: string;
  topic: string;
  coverUrl: string;
  likes: number;
}

// 帖子数据
export const POSTS: Post[] = ${JSON.stringify(posts, null, 2)};

// Feed 数据（使用远程占位图）
export const FEED_ITEMS: FeedItem[] = POSTS.map((post, index) => ({
  uid: post.uid,
  title: post.title,
  topic: post.topic,
  coverUrl: \`https://picsum.photos/400/500?random=\${index}\`,
  likes: [234, 567, 890, 123, 345][index % 5],
}));

// 获取帖子
export function getPost(uid: string): Post | undefined {
  return POSTS.find(p => p.uid === uid);
}
`;

  fs.writeFileSync(OUTPUT_FILE, output);
  
  console.log('✅ 转换成功！');
  console.log(`   📄 输入: ${inputFile}`);
  console.log(`   📄 输出: ${OUTPUT_FILE}`);
  console.log(`   📊 帖子数量: ${posts.length}`);
}

// 主程序
const inputFile = process.argv[2];

if (!inputFile) {
  console.log('用法: node scripts/convert-posts.js <input.jsonl>');
  console.log('');
  console.log('示例:');
  console.log('  node scripts/convert-posts.js ~/Downloads/posts.jsonl');
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.error(`❌ 文件不存在: ${inputFile}`);
  process.exit(1);
}

convertPosts(inputFile);

