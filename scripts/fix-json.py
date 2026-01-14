#!/usr/bin/env python3
"""
修复 postsData.json 中的未转义引号，并生成 posts.ts
用法：python3 scripts/fix-json.py
"""

import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
INPUT = os.path.join(ROOT_DIR, 'src/data/postsData.json')
OUTPUT = os.path.join(ROOT_DIR, 'src/data/posts.ts')

def main():
    with open(INPUT, 'r', encoding='utf-8') as f:
        content = f.read()

    # 手动解析，修复字符串内的未转义引号
    result = []
    i = 0
    while i < len(content):
        for key in ['text', 'title', 'topic']:
            pattern = f'"{key}": "'
            if content[i:i+len(pattern)] == pattern:
                result.append(pattern)
                i += len(pattern)
                while i < len(content):
                    if content[i] == '"':
                        j = i + 1
                        while j < len(content) and content[j] in ' \t\n\r':
                            j += 1
                        if j < len(content) and content[j] in ',}]':
                            break
                        else:
                            result.append('「')
                            i += 1
                            while i < len(content):
                                if content[i] == '"':
                                    k = i + 1
                                    while k < len(content) and content[k] in ' \t\n\r':
                                        k += 1
                                    if k < len(content) and content[k] in ',}]':
                                        break
                                    else:
                                        result.append('」')
                                        i += 1
                                        break
                                else:
                                    result.append(content[i])
                                    i += 1
                            continue
                    else:
                        result.append(content[i])
                        i += 1
                break
        else:
            result.append(content[i])
            i += 1

    fixed = ''.join(result)
    data = json.loads(fixed)
    
    # 生成 TypeScript
    ts = f'''/**
 * 帖子数据 - 自动生成
 */

export interface ContentBlock {{
  type: 'h1' | 'h2' | 'paragraph' | 'image' | 'spacer';
  text?: string;
  ref?: string;
}}

export interface PostPage {{
  index: number;
  blocks: ContentBlock[];
}}

export interface Post {{
  uid: string;
  title: string;
  topic: string;
  pages: PostPage[];
}}

export interface FeedItem {{
  uid: string;
  title: string;
  topic: string;
  coverUrl: string;
  likes: number;
}}

export const POSTS: Post[] = {json.dumps(data, ensure_ascii=False, indent=2)};

export const FEED_ITEMS: FeedItem[] = POSTS.map((post, index) => ({{
  uid: post.uid,
  title: post.title,
  topic: post.topic,
  coverUrl: `https://picsum.photos/400/500?random=${{index}}`,
  likes: [234, 567, 890, 123, 345][index % 5],
}}));

export function getPost(uid: string): Post | undefined {{
  return POSTS.find(p => p.uid === uid);
}}
'''
    
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        f.write(ts)
    
    print(f'✅ 成功转换 {len(data)} 篇帖子 → {OUTPUT}')

if __name__ == '__main__':
    main()

