/**
 * 从 JSONL 文件导入帖子数据
 */
const fs = require('fs');
const path = require('path');

// 读取 JSONL 文件
const jsonlPath = process.argv[2] || '/Users/pengguo/Downloads/posts.jsonl';
const jsonlContent = fs.readFileSync(jsonlPath, 'utf-8');

// 解析 JSONL（每行一个 JSON 对象）
const posts = jsonlContent
  .trim()
  .split('\n')
  .map(line => {
    const post = JSON.parse(line);
    // 只保留需要的字段
    return {
      uid: post.uid,
      title: post.title,
      topic: post.topic,
      pages: post.pages
    };
  });

// 写入 postsData.json
const outputPath = path.join(__dirname, '../src/data/postsData.json');
fs.writeFileSync(outputPath, JSON.stringify(posts, null, 2), 'utf-8');

console.log(`Successfully imported ${posts.length} posts to ${outputPath}`);

// 生成 posts.ts
const tsContent = `/**
 * 帖子数据
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

export const POSTS: Post[] = ${JSON.stringify(posts, null, 2)};
`;

const tsOutputPath = path.join(__dirname, '../src/data/posts.ts');
fs.writeFileSync(tsOutputPath, tsContent, 'utf-8');

console.log(`Successfully generated ${tsOutputPath}`);

