#!/usr/bin/env node
/**
 * 修复 JSON 文件中未转义的引号
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.join(__dirname, '../src/data/postsData.json');
const OUTPUT = path.join(__dirname, '../src/data/posts.ts');

// 读取文件
let content = fs.readFileSync(INPUT, 'utf-8');

// 状态机解析
let result = '';
let inString = false;
let stringStart = -1;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  const prev = i > 0 ? content[i-1] : '';
  
  if (char === '"') {
    if (!inString) {
      // 开始字符串
      inString = true;
      stringStart = i;
      result += char;
    } else if (prev === '\\') {
      // 已转义的引号
      result += char;
    } else {
      // 检查这是字符串结束还是内部引号
      // 如果后面紧跟 : , ] } 或空白+这些，就是结束
      let j = i + 1;
      while (j < content.length && /\s/.test(content[j])) j++;
      const next = content[j];
      
      if (next === ':' || next === ',' || next === ']' || next === '}' || next === undefined) {
        // 字符串结束
        inString = false;
        result += char;
      } else {
        // 内部引号，替换为「」
        result += '「';
        // 找到配对的引号
        let k = i + 1;
        while (k < content.length) {
          if (content[k] === '"' && content[k-1] !== '\\') {
            // 检查这是不是结束引号
            let m = k + 1;
            while (m < content.length && /\s/.test(content[m])) m++;
            const nextAfter = content[m];
            if (nextAfter === ':' || nextAfter === ',' || nextAfter === ']' || nextAfter === '}') {
              // 这是配对的内部引号结束
              break;
            }
          }
          k++;
        }
        // 处理到配对引号
        for (let x = i + 1; x < k; x++) {
          result += content[x];
        }
        result += '」';
        i = k; // 跳过已处理的内容
      }
    }
  } else {
    result += char;
  }
}

// 解析 JSON
let data;
try {
  data = JSON.parse(result);
  console.log('✅ JSON 解析成功！');
} catch (e) {
  console.error('❌ 解析失败:', e.message);
  // 保存中间结果用于调试
  fs.writeFileSync('/tmp/debug.json', result);
  console.log('调试文件已保存到 /tmp/debug.json');
  process.exit(1);
}

// 生成 TypeScript
const tsContent = `/**
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

fs.writeFileSync(OUTPUT, tsContent);
console.log('   帖子数量:', data.length);
