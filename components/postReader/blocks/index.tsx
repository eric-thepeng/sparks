import React, { useState } from 'react';
import { ContentBlock, Post } from '../../../types';

// Helper to look up image URL from Post data
const getImageUrl = (ref: string, post: Post) => {
    // 1. Try to find the inline image definition
    const inlineImg = post.inlineImages?.find(img => img.id === ref);
    if (!inlineImg) {
        // Fallback or placeholder if not found
        // Assuming images are in /tempData/images/{uid}_{ref}.png based on new schema
        return `/tempData/images/${post.id}_${ref}.png`;
    }
    // Construct path: /tempData/images/{uid}_{ref}.png
    return `/tempData/images/${post.id}_${ref}.png`;
};

export const Heading: React.FC<{ block: Extract<ContentBlock, { type: 'h1' | 'h2' | 'h3' }> }> = ({ block }) => {
  const sizes = {
    h1: 'text-2xl font-bold mb-4 mt-6 leading-tight',
    h2: 'text-xl font-bold mb-3 mt-5 leading-snug',
    h3: 'text-lg font-semibold mb-2 mt-4 leading-snug'
  };
  return <div className={`text-gray-900 ${sizes[block.type]}`}>{block.text}</div>;
};

export const Paragraph: React.FC<{ block: Extract<ContentBlock, { type: 'paragraph' }> }> = ({ block }) => {
  // Simple markdown-ish bold parser
  const parts = block.text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="text-[16px] text-gray-800 leading-relaxed mb-4">
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
           return <strong key={idx} className="font-bold">{part.slice(2, -2)}</strong>;
        }
        return <span key={idx}>{part}</span>;
      })}
    </div>
  );
};

export const Quote: React.FC<{ block: Extract<ContentBlock, { type: 'quote' }> }> = ({ block }) => (
  <div className="border-l-4 border-brand/40 pl-4 py-1 my-6 text-gray-600 italic bg-gray-50/50 rounded-r-lg">
    {block.text}
    {block.attribution && <div className="text-sm text-gray-400 mt-2 not-italic">— {block.attribution}</div>}
  </div>
);

export const Image: React.FC<{ block: Extract<ContentBlock, { type: 'image' }>; post: Post }> = ({ block, post }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const src = getImageUrl(block.ref, post);
  
  return (
    <div className={`my-6 flex flex-col items-center transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0 min-h-[300px]'}`}>
      <img 
        src={src} 
        alt={block.caption || 'post image'} 
        className="max-h-[66vh] w-auto max-w-full rounded-lg shadow-sm object-contain mx-auto"
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
      />
      {block.caption && <span className="text-xs text-gray-400 mt-2">{block.caption}</span>}
    </div>
  );
};

export const Spacer: React.FC<{ block: Extract<ContentBlock, { type: 'spacer' }> }> = ({ block }) => {
  const heights = { sm: 'h-4', md: 'h-8', lg: 'h-16' };
  return <div className={heights[block.size]} />;
};

export const List: React.FC<{ block: Extract<ContentBlock, { type: 'bullets' }> }> = ({ block }) => (
  <div className="mb-4 pl-1">
    {block.items.map((item, idx) => (
      <div key={idx} className="flex gap-2 my-1.5 items-start">
        <span className="text-brand shrink-0 mt-1.5 text-[6px]">•</span>
        <span className="text-[16px] text-gray-800 leading-relaxed flex-1">{item}</span>
      </div>
    ))}
  </div>
);

export const BlockRenderer: React.FC<{ block: ContentBlock; post: Post }> = ({ block, post }) => {
  switch (block.type) {
    case 'h1': 
    case 'h2': 
    case 'h3': return <Heading block={block} />;
    case 'paragraph': return <Paragraph block={block} />;
    case 'quote': return <Quote block={block} />;
    case 'image': return <Image block={block} post={post} />;
    case 'spacer': return <Spacer block={block} />;
    case 'bullets': return <List block={block} />;
    default: return null;
  }
};
