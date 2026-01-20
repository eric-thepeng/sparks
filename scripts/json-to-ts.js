#!/usr/bin/env node
/**
 * 将 postsData.json 转换为 posts.ts
 * 自动处理中文引号
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '../src/data/postsData.json');
const OUTPUT = path.join(__dirname, '../src/data/posts.ts');

// 先读取原始文本，替换中文引号
let rawText = fs.readFileSync(INPUT, 'utf-8');
rawText = rawText
  .replace(/"/g, '"')
  .replace(/"/g, '"')
  .replace(/'/g, "'")
  .replace(/'/g, "'");

// 解析 JSON
const data = JSON.parse(rawText);

const output = `/**
 * 帖子数据 - 从 postsData.json 转换
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

export const POSTS: Post[] = ${JSON.stringify(data, null, 2)};

export const FEED_ITEMS: FeedItem[] = POSTS.map((post, index) => ({
  uid: post.uid,
  title: post.title,
  topic: post.topic,
  coverUrl: \`https://picsum.photos/400/500?random=\${index}\`,
  likes: [234, 567, 890, 123, 345][index % 5],
}));

export function getPost(uid: string): Post | undefined {
  return POSTS.find(p => p.uid === uid);
}
`;

fs.writeFileSync(OUTPUT, output);
console.log('✅ 转换成功！');
console.log(`   📊 帖子数量: ${data.length}`);
console.log(`   📄 输出: ${OUTPUT}`);
