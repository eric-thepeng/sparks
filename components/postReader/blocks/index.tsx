import React, { useState } from 'react';
import { ContentBlock, Post } from '../../../types';

// Helper to look up image URL from Post data
const getImageUrl = (ref: string, post: Post) => {
    // Determine base URL
    const base = post.assetBaseUrl ? post.assetBaseUrl.replace(/\/$/, '') : '';
    const imagePath = post.assetBaseUrl ? '/images' : '/tempData/images';
    
    // 1. Try to find the inline image definition (if needed for metadata, though URL construction is generic)
    const inlineImg = post.inlineImages?.find(img => img.id === ref);
    
    // 2. Construct path
    return `${base}${imagePath}/${post.id}_${ref}.png`;
};

export const Heading: React.FC<{ block: Extract<ContentBlock, { type: 'h1' | 'h2' | 'h3' }> }> = ({ block }) => {
  const Tag = block.type;
  const classes = {
    h1: "text-2xl font-bold mb-6 text-gray-900 leading-tight",
    h2: "text-xl font-bold mt-8 mb-4 text-gray-800 leading-snug",
    h3: "text-lg font-bold mt-6 mb-3 text-gray-800"
  };

  return <Tag className={classes[block.type]}>{block.text}</Tag>;
};

export const Paragraph: React.FC<{ block: Extract<ContentBlock, { type: 'paragraph' }> }> = ({ block }) => {
  return <p className="text-gray-700 leading-relaxed mb-4 text-[17px] tracking-wide text-justify">{block.text}</p>;
};

export const Quote: React.FC<{ block: Extract<ContentBlock, { type: 'quote' }> }> = ({ block }) => (
  <div className="my-6 pl-4 border-l-4 border-brand/40 italic text-gray-600 bg-gray-50 py-2 pr-2 rounded-r-lg">
    <p className="text-lg font-serif">"{block.text}"</p>
    {block.attribution && <div className="text-sm text-gray-400 mt-2 text-right">— {block.attribution}</div>}
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
  const heights = {
    sm: 'h-4',
    md: 'h-8',
    lg: 'h-16'
  };
  return <div className={heights[block.size || 'md']} />;
};

export const List: React.FC<{ block: Extract<ContentBlock, { type: 'bullets' }> }> = ({ block }) => (
  <div className="mb-4 pl-2 space-y-2">
    {block.items.map((item, idx) => (
      <div key={idx} className="flex items-start gap-2 text-gray-700 leading-relaxed text-[17px]">
        <span className="text-brand mt-1.5 text-[8px]">●</span>
        <span>{item}</span>
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
