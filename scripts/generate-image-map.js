#!/usr/bin/env node
/**
 * 自动生成 imageMap.ts
 * 
 * 用法：
 *   node scripts/generate-image-map.js
 * 
 * 或者在 package.json 中添加：
 *   "scripts": { "gen:images": "node scripts/generate-image-map.js" }
 *   然后运行：npm run gen:images
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../assets/posts');
const OUTPUT_FILE = path.join(__dirname, '../src/data/imageMap.ts');

function generateImageMap() {
  // 读取所有图片文件
  const files = fs.readdirSync(ASSETS_DIR).filter(f => f.endsWith('.png'));
  
  // 按 UID 分组
  const postMap = {};
  
  files.forEach(file => {
    // 文件名格式：{uid}_cover.png 或 {uid}_img_{n}.png
    const match = file.match(/^([a-f0-9]+)_(cover|img_\d+)\.png$/);
    if (!match) {
      console.warn(`⚠️  跳过不规范的文件名: ${file}`);
      return;
    }
    
    const [, uid, type] = match;
    
    if (!postMap[uid]) {
      postMap[uid] = { cover: null, images: [] };
    }
    
    if (type === 'cover') {
      postMap[uid].cover = file;
    } else {
      postMap[uid].images.push({ ref: type, file });
    }
  });
  
  // 排序图片 (img_1, img_2, ...)
  Object.values(postMap).forEach(post => {
    post.images.sort((a, b) => {
      const numA = parseInt(a.ref.replace('img_', ''));
      const numB = parseInt(b.ref.replace('img_', ''));
      return numA - numB;
    });
  });
  
  // 生成 TypeScript 代码
  const uids = Object.keys(postMap).sort();
  
  let output = `/**
 * 图片映射 - 自动生成，请勿手动编辑
 * 
 * 生成命令：node scripts/generate-image-map.js
 * 生成时间：${new Date().toISOString()}
 * 
 * React Native 不支持动态 require()，所以需要预先定义所有图片路径。
 * 这类似于 Unity 的 Resources.Load() 需要在编译时确定路径。
 */

import { ImageSource } from 'expo-image';

`;

  // 生成 require 语句
  uids.forEach((uid, index) => {
    const post = postMap[uid];
    const varPrefix = `post${index + 1}`;
    
    output += `// Post ${index + 1}: ${uid}\n`;
    
    if (post.cover) {
      output += `const ${varPrefix}_cover = require('../../assets/posts/${post.cover}');\n`;
    }
    
    post.images.forEach(img => {
      const varName = img.ref.replace('img_', 'img');
      output += `const ${varPrefix}_${varName} = require('../../assets/posts/${img.file}');\n`;
    });
    
    output += '\n';
  });

  // 生成类型定义
  output += `// 图片映射表类型
type ImageMap = {
  [uid: string]: {
    cover: ImageSource;
    images: { [key: string]: ImageSource };
  };
};

`;

  // 生成 POST_IMAGES 对象
  output += `export const POST_IMAGES: ImageMap = {\n`;
  
  uids.forEach((uid, index) => {
    const post = postMap[uid];
    const varPrefix = `post${index + 1}`;
    
    output += `  '${uid}': {\n`;
    output += `    cover: ${varPrefix}_cover,\n`;
    output += `    images: {\n`;
    
    post.images.forEach(img => {
      const varName = img.ref.replace('img_', 'img');
      output += `      '${img.ref}': ${varPrefix}_${varName},\n`;
    });
    
    output += `    },\n`;
    output += `  },\n`;
  });
  
  output += `};\n\n`;

  // 生成辅助函数
  output += `/**
 * 获取帖子封面图
 * @param uid 帖子 ID
 */
export const getCoverImage = (uid: string): ImageSource | undefined => {
  return POST_IMAGES[uid]?.cover;
};

/**
 * 获取帖子内嵌图片
 * @param uid 帖子 ID
 * @param imageRef 图片引用，如 "img_1"
 */
export const getInlineImage = (uid: string, imageRef: string): ImageSource | undefined => {
  return POST_IMAGES[uid]?.images[imageRef];
};
`;

  // 写入文件
  fs.writeFileSync(OUTPUT_FILE, output);
  
  // 输出统计
  console.log('✅ imageMap.ts 生成成功！');
  console.log(`   📁 帖子数量: ${uids.length}`);
  console.log(`   🖼️  图片总数: ${files.length}`);
  uids.forEach((uid, i) => {
    const post = postMap[uid];
    console.log(`   - Post ${i + 1}: ${uid.slice(0, 8)}... (封面: ${post.cover ? '✓' : '✗'}, 插图: ${post.images.length})`);
  });
}

generateImageMap();

